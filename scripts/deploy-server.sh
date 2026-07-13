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

# Healthcheck бэкенда через nginx (proxy /health → app).
# -k игнорирует сертификат: localhost, а не bookstrata.ru.
check_health() {
  info "Healthcheck: ждём поднятия бэкенда..."
  local url="https://localhost/health"
  local retries=15
  local sleep_sec=2
  for i in $(seq 1 "$retries"); do
    if curl -sfk --max-time 3 "$url" >/dev/null 2>&1; then
      ok "Бэкенд отвечает ($url)"
      return 0
    fi
    sleep "$sleep_sec"
  done
  err "Бэкенд не ответил за $((retries * sleep_sec)) сек"
  err "Логи: docker logs bookstrata-api --tail 50"
  return 1
}

SKIP_BUILD=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=true; shift ;;
    --rollback)   ROLLBACK=true; shift ;;
    --help)
      echo "Использование: $0 [--skip-build] [--rollback]"
      echo ""
      echo "  --skip-build    не собирать фронт (если не менялся)"
      echo "  --rollback      откатить фронт на предыдущую версию (dist.old)"
      exit 0
      ;;
    *)
      err "Неизвестный флаг: $1"
      exit 1
      ;;
  esac
done

# ——— Откат на предыдущую версию фронта ———
if [ "$ROLLBACK" = true ]; then
  info "ROLLBACK: возврат к предыдущей версии фронта..."
  cd "$PROJECT_DIR"

  if [ ! -d "$PROJECT_DIR/dist.old" ]; then
    err "dist.old не найден — откатываться не на что"
    err "Возможно, первый деплой или dist.old удалён вручную"
    exit 1
  fi

  # Треугольный swap — обратимый. Повторный --rollback вернёт обратно:
  #   было:  dist=v2, dist.old=v1
  #   стало: dist=v1, dist.old=v2
  mv "$PROJECT_DIR/dist"     "$PROJECT_DIR/dist.tmp"
  mv "$PROJECT_DIR/dist.old" "$PROJECT_DIR/dist"
  mv "$PROJECT_DIR/dist.tmp" "$PROJECT_DIR/dist.old"
  ok "Фронт откачен к предыдущей версии"

  info "Перезапуск nginx..."
  cd "$PROJECT_DIR/backend"
  docker compose --profile full restart nginx
  ok "Nginx перезапущен"

  check_health || { err "Откат применён, но бэкенд не отвечает"; exit 1; }

  echo ""
  ok "Откат завершён"
  exit 0
fi

# ——— 1. Стянуть код ———
info "Стягиваем последний код из git..."
cd "$PROJECT_DIR"
git pull
ok "Код обновлён"

# ——— 2. Собрать фронтенд во временную директорию ———
if [ "$SKIP_BUILD" = false ]; then
  info "Сборка фронтенда..."
  # Собираем в dist.tmp, чтобы не сломать работающую версию во время билда
  npx vite build --outDir dist.tmp
  ok "Фронтенд собран"
else
  warn "Сборка пропущена (--skip-build)"
fi

# ——— 3. Prerender для SEO ———
# Запускается на dist.tmp, но prerender-скрипт жёстко завязан на dist/.
# Поэтому: сохраняем dist → dist.saved, кладём dist.tmp → dist,
#          prerender, возвращаем dist → dist.tmp, восстанавливаем dist.
if [ "$SKIP_BUILD" = false ]; then
  info "Prerender публичных маршрутов..."

  # API_URL напрямую к бэкенду (минуя nginx) — чтобы fetch в Node.js
  # не падал на самоподписанном сертификате. Порт 8080 — внутренний порт app-контейнера.
  export API_URL="http://localhost:8080"
  ok "API_URL=http://localhost:8080 (prerender напрямую к бэкенду)"

  # Проверяем доступность бэкенда (предупреждение, не блокер)
  if ! curl -sf --max-time 3 'http://localhost:8080/health' >/dev/null 2>&1; then
    warn "Бэкенд (localhost:8080/health) не отвечает — prerender будет без данных"
  fi

  mv "$PROJECT_DIR/dist" "$PROJECT_DIR/dist.saved" 2>/dev/null || true
  mv "$PROJECT_DIR/dist.tmp" "$PROJECT_DIR/dist"

  # Prerender опциональный — если нет chromium, graceful fallback
  if node "$PROJECT_DIR/scripts/prerender.mjs"; then
    ok "Prerender завершён"
  else
    warn "Prerender пропущен (опционально) — сайт работает как SPA"
  fi

  mv "$PROJECT_DIR/dist" "$PROJECT_DIR/dist.tmp"
  [ -d "$PROJECT_DIR/dist.saved" ] && mv "$PROJECT_DIR/dist.saved" "$PROJECT_DIR/dist"
fi

# ——— 4. Атомарный swap dist ———
# mv на одной файловой системе — атомарная операция
if [ "$SKIP_BUILD" = false ]; then
  info "Атомарный swap dist..."
  # Трёхходовой атомарный swap для сохранения fallback-версии:
  #   1. dist.old  → удаляем (там сборка с N-2 деплоя, устарела)
  #   2. dist      → dist.old (предыдущая сборка → fallback для старых чанков)
  #   3. dist.tmp  → dist    (новая сборка → в продакшен)
  rm -rf "$PROJECT_DIR/dist.old"
  # Если dist отсутствует (например, после шага 3, когда нечего было сохранять) —
  # не падаем, просто пропускаем сохранение fallback-версии.
  if [ -d "$PROJECT_DIR/dist" ]; then
    mv "$PROJECT_DIR/dist" "$PROJECT_DIR/dist.old"
  fi
  mv "$PROJECT_DIR/dist.tmp" "$PROJECT_DIR/dist"
  ok "dist обновлён (старая версия сохранена в dist.old)"
fi

# ——— 5. Пересобрать бэкенд ———
info "Сборка Docker-образа бэкенда..."
cd "$PROJECT_DIR/backend"
docker compose --profile full build app
ok "Бэкенд собран"

# ——— 6. Чистим build cache ———
info "Чистка Docker build cache..."
docker builder prune -af
ok "Build cache очищен"

# ——— 7. Перезапускаем контейнеры ———
info "Перезапуск бэкенда и nginx (postgres/redis не трогаем)..."
# nginx пересоздаём принудительно: compose кэширует конфиг контейнера, и при
# изменении volumes (как было с dist.old) старый Created-контейнер может
# застрять с битыми mount'ами. --force-recreate гарантирует актуальный конфиг.
docker compose --profile full up -d app
docker compose --profile full up -d --force-recreate nginx
ok "Контейнеры запущены"

# Старая версия фронта (dist.old) не удаляется — она нужна nginx как fallback
# для старых JS-чанков, пока пользователи не обновят страницу.
# Она будет перезаписана при следующем деплое.

# ——— 8. Healthcheck ———
if ! check_health; then
  err "Деплой завершился, но бэкенд не здоров!"
  err "Откат: bash scripts/deploy-server.sh --rollback"
  exit 1
fi

echo ""
ok "Деплой завершён"
