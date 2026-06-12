#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# BookStrata — deploy на продакшен (Docker)
# ============================================================
# Использование:
#   ./scripts/deploy.sh                    # деплой с интерактивным выбором
#   ./scripts/deploy.sh --skip-build       # без сборки фронта
#   ./scripts/deploy.sh --only-front       # только фронтенд (без пересборки бэкенда)
#   ./scripts/deploy.sh --help             # справка
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ——— Конфигурация (можно переопределить через переменные окружения) ———
SSH_HOST="${SSH_HOST:-root@bookstrata.ru}"
REMOTE_DIR="${REMOTE_DIR:-/root/bookstrata}"
# —————————————————————————————————————————————————————————

# Цветной вывод
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[deploy]${NC} $1"; }
ok()    { echo -e "${GREEN}[ ✓ ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ ! ]${NC} $1"; }
err()   { echo -e "${RED}[ ✗ ]${NC} $1"; }

# ——— Разбор флагов ———
SKIP_BUILD=false
ONLY_FRONT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=true; shift ;;
    --only-front) ONLY_FRONT=true; shift ;;
    --help)
      echo "Использование: $0 [--skip-build] [--only-front]"
      echo ""
      echo "  --skip-build    не собирать фронт локально (если уже собран)"
      echo "  --only-front    обновить только dist/ (без пересборки бэкенда)"
      exit 0
      ;;
    *)
      err "Неизвестный флаг: $1"
      exit 1
      ;;
  esac
done

# ——— 1. Сборка фронтенда ———
if [ "$SKIP_BUILD" = false ]; then
  info "Сборка фронтенда..."
  cd "$PROJECT_DIR"
  npm run build
  ok "Фронтенд собран"
else
  warn "Сборка пропущена (--skip-build)"
fi

# ——— 2. Копирование на сервер ———
info "Копирование на сервер ($SSH_HOST:$REMOTE_DIR)..."

rsync -az --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.production' \
  --exclude '.codegraph' \
  --exclude '.opencode' \
  --exclude '.playwright-mcp' \
  --exclude 'e2e' \
  --exclude 'testsprite_tests' \
  --exclude 'screenshots' \
  --exclude 'backups' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  --exclude '.history' \
  "$PROJECT_DIR"/ "$SSH_HOST:$REMOTE_DIR/"

ok "Проект скопирован на сервер"

# ——— 3. Пересборка и рестарт на сервере ———
if [ "$ONLY_FRONT" = true ]; then
  info "--only-front: nginx подхватит новый dist/ без рестарта"
  ok "Деплой фронтенда завершён"
  exit 0
fi

info "Пересборка Docker-образов на сервере..."

ssh "$SSH_HOST" "
  cd $REMOTE_DIR/backend

  # Собираем образ бэкенда (с кэшированием слоёв)
  docker compose --profile full build app

  # Чистим build cache — освобождает гигабайты после каждой сборки
  sudo docker builder prune -af

  # Перезапускаем контейнеры с новым образом
  docker compose --profile full up -d

  # Применяем миграции, если есть новые
  docker exec bookstrata-api npx prisma migrate deploy 2>/dev/null || true
"

ok "Деплой завершён"
