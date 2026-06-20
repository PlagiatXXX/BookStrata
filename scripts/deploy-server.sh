#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# BookStrata — деплой на сервере (запускать в /root/bookstrata)
# ============================================================
# Использование:
#   bash scripts/deploy-server.sh
#   bash scripts/deploy-server.sh --skip-build
#   bash scripts/deploy-server.sh --help
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[deploy]${NC} $1"; }
ok()    { echo -e "${GREEN}[ ✓ ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ ! ]${NC} $1"; }
err()   { echo -e "${RED}[ ✗ ]${NC} $1"; }

SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=true; shift ;;
    --help)
      echo "Использование: $0 [--skip-build]"
      echo ""
      echo "  --skip-build    не собирать фронт (если не менялся)"
      exit 0
      ;;
    *)
      err "Неизвестный флаг: $1"
      exit 1
      ;;
  esac
done

# ——— 1. Стянуть код ———
info "Стягиваем последний код из git..."
cd "$PROJECT_DIR"
git pull
ok "Код обновлён"

# ——— 2. Собрать фронтенд во временную директорию ———
if [ "$SKIP_BUILD" = false ]; then
  info "Сборка фронтенда..."
  # Собираем в dist.tmp, чтобы не сломать работающую версию во время билда
  vite build --outDir dist.tmp
  ok "Фронтенд собран"
else
  warn "Сборка пропущена (--skip-build)"
fi

# ——— 3. Атомарный swap dist ———
# mv на одной файловой системе — атомарная операция
if [ "$SKIP_BUILD" = false ]; then
  info "Атомарный swap dist..."
  # Удаляем предыдущий backup
  rm -rf "$PROJECT_DIR/dist.old"
  # Перемещаем текущую версию в backup
  mv "$PROJECT_DIR/dist" "$PROJECT_DIR/dist.old" 2>/dev/null || true
  # Атомарно подкладываем новую версию
  mv "$PROJECT_DIR/dist.tmp" "$PROJECT_DIR/dist"
  ok "dist обновлён (старая версия сохранена в dist.old)"
fi

# ——— 4. Пересобрать бэкенд ———
info "Сборка Docker-образа бэкенда..."
cd "$PROJECT_DIR/backend"
docker compose --profile full build app
ok "Бэкенд собран"

# ——— 5. Чистим build cache ———
info "Чистка Docker build cache..."
docker builder prune -af
ok "Build cache очищен"

# ——— 6. Перезапускаем контейнеры ———
info "Перезапуск бэкенда и nginx (postgres/redis не трогаем)..."
docker compose --profile full up -d app nginx
ok "Контейнеры запущены"

# ——— 7. Удаляем старую версию фронта ———
info "Удаление старой версии фронта..."
rm -rf "$PROJECT_DIR/dist.old"
ok "Старая версия удалена"

echo ""
ok "Деплой завершён"
