#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# BookStrata — ежедневный prerender публичных тир-листов
# ============================================================
# Запускать по cron раз в сутки.
# Генерирует статический HTML для новых и изменившихся
# публичных тир-листов, которые появились после последнего деплоя.
#
# Crontab (от root):
#   0 6 * * * /root/bookstrata/scripts/prerender-cron.sh >> /var/log/bookstrata/prerender-cron.log 2>&1
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/var/log/bookstrata"

LOCK_FILE="/tmp/bookstrata-prerender.lock"
PORT=4173

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[prerender-cron]${NC} $1"; }
ok()    { echo -e "${GREEN}[ ✓ ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ ! ]${NC} $1"; }
err()   { echo -e "${RED}[ ✗ ]${NC} $1"; }

cleanup() {
  if [ -n "$LOCK_CREATED" ]; then
    rm -f "$LOCK_FILE"
  fi
}
trap cleanup EXIT

# ——— Lock ———
if [ -f "$LOCK_FILE" ]; then
  pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "unknown")
  if kill -0 "$pid" 2>/dev/null; then
    warn "Предыдущий prerender ещё выполняется (PID $pid), пропускаем"
    exit 0
  fi
  warn "Мёртвый lock ($pid) — удаляем"
  rm -f "$LOCK_FILE"
fi
echo $$ > "$LOCK_FILE"
LOCK_CREATED=1

# ——— Директория проекта ———
cd "$PROJECT_DIR"

# ——— Логи ———
mkdir -p "$LOG_DIR"

# ——— Проверка dist/ ———
if [ ! -d "$PROJECT_DIR/dist" ] || [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
  err "dist/ не найден или повреждён. Сначала выполните сборку фронта."
  exit 1
fi
ok "dist/ найден"

# ——— Проверка бэкенда ———
info "Проверка бэкенда..."
BACKEND_URL="${API_URL:-https://localhost}"
if curl -sfk --max-time 5 "$BACKEND_URL/health" >/dev/null 2>&1; then
  ok "Бэкенд доступен ($BACKEND_URL/health)"
else
  warn "Бэкенд не отвечает — prerender будет без данных тир-листов"
fi

# ——— Экспорт маршрутов коллекций (fallback для prerender) ———
info "Экспорт маршрутов коллекций из БД..."
if npx tsx "$PROJECT_DIR/backend/scripts/export-collection-routes.ts" 2>&1; then
  ok "Маршруты коллекций экспортированы"
else
  warn "Не удалось экспортировать коллекции — prerender использует JSON из репы"
fi

# ——— Запуск prerender ———
info "Запуск prerender..."
export API_URL="$BACKEND_URL"
export NODE_TLS_REJECT_UNAUTHORIZED=0

if node "$PROJECT_DIR/scripts/prerender.mjs" 2>&1; then
  ok "Prerender завершён"
else
  err "Prerender завершился с ошибкой (см. выше)"
  exit 1
fi

# ——— Закончили ———
ok "Cron-prerender выполнен успешно"
