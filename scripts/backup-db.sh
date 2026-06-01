#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# BookStrata — ежедневный бэкап PostgreSQL (+ Яндекс.Облако)
# Cron: 0 3 * * * /path/to/bookstrata/scripts/backup-db.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Загружаем .env backend'а
ENV_FILE="$PROJECT_DIR/backend/.env"
if [ -f "$ENV_FILE" ]; then
  set -a && source "$ENV_FILE" && set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERROR] DATABASE_URL не задана." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
FILENAME="bookstrata_$TIMESTAMP.sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..."

# Дамп + gzip
pg_dump "$DATABASE_URL" --no-owner | gzip > "$FILEPATH"

SIZE=$(du -h "$FILEPATH" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Local backup saved: $FILENAME ($SIZE)"

# Удаляем локальные бэкапы старше N дней
find "$BACKUP_DIR" -name "bookstrata_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Local backups older than $RETENTION_DAYS days cleaned."

# === Загрузка в Яндекс.Облако (S3) ===
if command -v aws &>/dev/null && [ -n "${YC_BACKUP_BUCKET:-}" ]; then
  export AWS_ACCESS_KEY_ID="${YC_ACCESS_KEY_ID}"
  export AWS_SECRET_ACCESS_KEY="${YC_SECRET_ACCESS_KEY}"
  export AWS_DEFAULT_REGION="${YC_REGION:-ru-central1}"

  S3_PATH="s3://$YC_BACKUP_BUCKET/daily/$FILENAME"

  if aws --endpoint-url "$YC_ENDPOINT" s3 cp "$FILEPATH" "$S3_PATH" --only-show-errors; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploaded to Yandex Cloud: $S3_PATH"

    # Чистим старые бэкапы в облаке (старше N дней)
    OLD_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
    aws --endpoint-url "$YC_ENDPOINT" s3 ls "s3://$YC_BACKUP_BUCKET/daily/" \
      | awk '{print $4}' \
      | while read -r key; do
          FILE_DATE=$(echo "$key" | sed 's/bookstrata_//;s/_.*//')
          if [[ "$FILE_DATE" < "$OLD_DATE" ]]; then
            aws --endpoint-url "$YC_ENDPOINT" s3 rm "s3://$YC_BACKUP_BUCKET/daily/$key" --only-show-errors
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleted from cloud: $key"
          fi
        done
  else
    echo "[WARN] Upload to Yandex Cloud failed." >&2
  fi
else
  echo "[SKIP] Yandex Cloud upload: aws CLI not found or YC_BACKUP_BUCKET not set."
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done."
