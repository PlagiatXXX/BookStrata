#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# BookStrata — перегенерация пререндеренного HTML без деплоя
#   Запускать на сервере (путь-независимо):
#   bash scripts/reprerender.sh
#   bash scripts/reprerender.sh --only /authors/agata-kristi
#   bash scripts/reprerender.sh --only /books/foo --only /collections/bar
#
# Пайплайн: flock → health-check → экспорт роутов → prerender → IndexNow.
# Если бэкенд не отвечает — exit 1, существующий HTML НЕ трогаем
# (сам prerender при недоступном API затирает страницы fallback-заглушкой).
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
API_URL="http://localhost:8080"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[reprerender]${NC} $1"; }
ok()   { echo -e "${GREEN}[ ✓ ]${NC} $1"; }
warn() { echo -e "${YELLOW}[ ! ]${NC} $1"; }
err()  { echo -e "${RED}[ ✗ ]${NC} $1"; }

# ——— 1. Аргументы: --only повторяемый (собираем вместе с ключом) ———
ONLY_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --only)
      if [[ $# -lt 2 || "$2" == --* ]]; then
        err "--only требует путь (например: --only /authors/agata-kristi)"
        exit 1
      fi
      ONLY_ARGS+=("--only" "$2")
      shift 2
      ;;
    --help|-h)
      echo "Использование: $0 [--only <путь>]..."
      echo ""
      echo "  --only <путь>   пререндерить только указанный маршрут (можно повторять)"
      echo "  без аргументов  полный прогон всех публичных маршрутов"
      exit 0
      ;;
    *)
      err "Неизвестный аргумент: $1 (см. --help)"
      exit 1
      ;;
  esac
done

# ——— 2. Защита от параллельных запусков (ручной + cron) ———
# flock -n: lock занят → второй запуск пропускается с warn, exit 0.
LOCK_FILE="/tmp/bookstrata-reprerender.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  warn "reprerender уже запущен (lock: $LOCK_FILE) — пропускаем"
  exit 0
fi

# ——— 3. Health-check бэкенда ———
# /health всегда отдаёт HTTP 200, статус — в теле {"status":"ok"|"degraded"}:
# проверяем тело, иначе упавшая БД (degraded) пропустила бы health-check.
# Нет ok → exit 1: существующий HTML не перезаписывается (см. риски спеки).
info "Healthcheck: $API_URL/health"
if ! curl -sf --max-time 5 "$API_URL/health" | grep -q '"status":"ok"'; then
  err "Бэкенд не отвечает или БД недоступна ($API_URL/health) — пререндер пропущен, HTML не тронут"
  exit 1
fi
ok "Бэкенд отвечает"

# ——— 4. dist и spa-index.html ———
if [[ ! -f "$PROJECT_DIR/dist/index.html" ]]; then
  err "dist/index.html не найден — сначала выполните npm run build:prod"
  exit 1
fi
# spa-index.html — SPA-fallback для nginx (паттерн deploy-server.sh, шаг 8).
# Создаём при первом запуске на «голом» dist.
if [[ ! -f "$PROJECT_DIR/dist/spa-index.html" ]]; then
  cp "$PROJECT_DIR/dist/index.html" "$PROJECT_DIR/dist/spa-index.html"
  ok "SPA-fallback создан (dist/spa-index.html)"
fi

# ——— 5. Экспорт списков роутов из БД ———
# Паттерн deploy-server.sh (шаг 11): креды из backend/.env, DATABASE_URL явно.
# Падение отдельного экспорта → warn: prerender возьмёт JSON из репы.
info "Экспорт маршрутов (collection/book/author) из БД..."
cd "$PROJECT_DIR/backend"
DB_USER="${POSTGRES_USER:-bookstrata}"
DB_PASS="${POSTGRES_PASSWORD:-}"
if [[ -z "$DB_PASS" && -f .env ]]; then
  DB_PASS="$(grep -E '^POSTGRES_PASSWORD=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi
if [[ -z "$DB_PASS" ]]; then
  warn "POSTGRES_PASSWORD не задан (backend/.env) — экспорт пропущен, берём JSON из репы"
else
  DB_URL="postgresql://$DB_USER:$DB_PASS@127.0.0.1:5432/bookstrata"
  for exp in export-collection-routes export-book-routes export-author-routes; do
    if DATABASE_URL="$DB_URL" npx tsx "scripts/$exp.ts"; then
      ok "$exp"
    else
      warn "$exp упал — prerender использует JSON из репы"
    fi
  done
fi
cd "$PROJECT_DIR"

# ——— 6. Prerender ———
# Упал (в т.ч. --only не совпал → exit 1 из prerender.mjs) → set -e прерывает
# скрипт: IndexNow не пингуем, общий exit 1 (лог cron).
info "Prerender: ${ONLY_ARGS[*]:-все публичные маршруты}"
if [[ ${#ONLY_ARGS[@]} -gt 0 ]]; then
  node "$PROJECT_DIR/scripts/prerender.mjs" "${ONLY_ARGS[@]}"
else
  node "$PROJECT_DIR/scripts/prerender.mjs"
fi
ok "Prerender завершён"

# ——— 7. IndexNow ping ———
# Опционально: сбой не роняет скрипт (паттерн deploy-server.sh, шаг 13).
info "IndexNow: пинг поисковиков..."
if node "$PROJECT_DIR/scripts/indexnow-ping.mjs" \
     --sitemap "https://bookstrata.ru/sitemap.xml" \
     --state "$PROJECT_DIR/.indexnow-state.json"; then
  ok "IndexNow: пинг выполнен"
else
  warn "IndexNow: пинг не удался (опционально) — поисковики найдут изменения сами"
fi

ok "Готово"
