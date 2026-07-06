#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# BookStrata — ежедневный отчёт в Telegram
# Cron: 0 8 * * * /root/bookstrata/scripts/daily-report.sh
# ============================================================
# Перед использованием:
#   1. Создать бота через @BotFather, получить токен
#   2. Найти свой chat_id (написать боту @userinfobot)
#   3. Создать /root/bookstrata/.env.report:
#        TELEGRAM_BOT_TOKEN="..."
#        TELEGRAM_CHAT_ID="..."
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.report"

if [ -f "$ENV_FILE" ]; then
  set -a && source "$ENV_FILE" && set +a
fi

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_CHAT_ID:-}"

if [ -z "$BOT_TOKEN" ] || [ -z "$CHAT_ID" ]; then
  echo "[ERROR] TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы."
  echo "        Создайте $ENV_FILE и добавьте их."
  exit 1
fi

# ─── Сбор данных ────────────────────────────────────────────

DATE=$(date '+%Y-%m-%d %H:%M')
HOSTNAME=$(hostname)

# Система
DISK=$(df -h / | awk 'NR==2{printf "%s / %s (%s)", $3, $2, $5}')
MEMORY=$(free -h | awk '/Mem/{printf "%s / %s", $3, $2}')
LOAD=$(uptime | awk -F'load average:' '{print $2}' | xargs)
UPTIME=$(uptime -p | sed 's/up //')

# Docker-контейнеры
CONTAINERS=$(timeout 5 docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "Docker недоступен")

# Бэкап
BACKUP_LOG=$(tail -3 /var/log/bookstrata/backup.log 2>/dev/null || echo "Нет лога")

# Пререндер
PRERENDER_LAST=$(grep -a "Cron-prerender" /var/log/bookstrata/prerender-cron.log 2>/dev/null | tail -1 || echo "Нет данных")
PRERENDER_RESULT=$(grep -a "📊 Prerender results" /var/log/bookstrata/prerender-cron.log 2>/dev/null | tail -1 || echo "Нет данных")

# Health бэкенда
if curl -sfk --max-time 5 'https://localhost/health' >/dev/null 2>&1; then
  BACKEND_STATUS="✅ доступен"
else
  BACKEND_STATUS="❌ не отвечает"
fi

# Метрика (сколько хитов за последние 24ч — если доступна)
METRIKA_LINE=$(grep -a "Сводка" /var/log/bookstrata/prerender-cron.log 2>/dev/null | tail -1 || echo "")

# SSL (дней до истечения)
if command -v openssl &>/dev/null; then
  SSL_EXPIRY=$(timeout 5 openssl s_client -connect bookstrata.ru:443 -servername bookstrata.ru 2>/dev/null <<< "" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "не удалось проверить")
  if [ -n "$SSL_EXPIRY" ] && [ "$SSL_EXPIRY" != "не удалось проверить" ]; then
    SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s 2>/dev/null || echo 0)
    NOW_EPOCH=$(date +%s)
    SSL_DAYS=$(( (SSL_EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    if [ "$SSL_DAYS" -lt 14 ]; then
      SSL_STATUS="⚠️ истекает через $SSL_DAYS дн."
    else
      SSL_STATUS="✅ $SSL_DAYS дн."
    fi
  else
    SSL_STATUS="❌ не проверен"
  fi
else
  SSL_STATUS="openssl не найден"
fi

# ─── Формируем сообщение ─────────────────────────────────────

MSG="📊 *Ежедневный отчёт BookStrata*
${DATE} | ${HOSTNAME}

━━━ Система ━━━
💾 Диск: ${DISK}
🧠 Память: ${MEMORY}
📈 Load: ${LOAD}
⏱ Uptime: ${UPTIME}
🔒 SSL: ${SSL_STATUS}

━━━ Сервисы ━━━
🌐 Бэкенд: ${BACKEND_STATUS}

━━━ Docker ━━━
\`\`\`
${CONTAINERS}
\`\`\`

━━━ Бэкап (${DATE:0:10}) ━━━
\`\`\`
${BACKUP_LOG}
\`\`\`

━━━ Пререндер ━━━
${PRERENDER_RESULT}
${PRERENDER_LAST}"

# ─── Отправка ───────────────────────────────────────────────

curl -s --max-time 10 -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d text="${MSG}" \
  -d parse_mode="Markdown" \
  -d disable_web_page_preview=true >/dev/null 2>&1

echo "Report sent at $(date)"
