# ============================================================
# BookStrata Backend — Dockerfile (multi-stage)
# ============================================================
# Usage:
#   docker build -t bookstrata-backend -f backend/Dockerfile backend/
#
#   docker run -d \
#     --name bookstrata-api \
#     --env-file backend/.env \
#     -p 8080:8080 \
#     bookstrata-backend
# ============================================================

# --- Debian 11 (Bullseye) — OpenSSL 1.1 из коробки ---
# Prisma 4.x engine требует libssl.so.1.1. На Debian 12 (Bookworm)
# только OpenSSL 3.0, а на Bullseye — 1.1 из коробки.

# ---------- Stage 1: Builder ----------
FROM node:20-bullseye-slim AS builder

WORKDIR /build

# Сначала только package.json — для кэширования слоя зависимостей
COPY package.json package-lock.json ./
# Устанавливаем все зависимости (включая prisma CLI для генерации клиента)
RUN npm ci

# Prisma schema + генерация клиента
COPY prisma/ ./prisma/
# Используем --no-install, чтобы npx не пытался скачать пакет из registry
# (prisma уже установлен через npm ci на предыдущем шаге)
RUN npx --no-install prisma generate

# Исходники + компиляция
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Удаляем dev-зависимости (теперь копируем только production)
RUN npm prune --omit=dev && \
    npm cache clean --force

# ---------- Stage 2: Production ----------
FROM node:20-bullseye-slim AS production

RUN groupadd -g 1001 appgroup && \
    useradd -m -u 1001 -g appgroup appuser

WORKDIR /app

# Копируем уже очищенные node_modules и собранный код
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist
# Prisma schema нужен runtime для migrate deploy
COPY prisma/ ./prisma/
# Скрипты (миграции, утилиты)
COPY scripts/ ./scripts/
COPY tsconfig.json ./

# Запускаем от непривилегированного пользователя
USER appuser

EXPOSE 8080

# Healthcheck через встроенный http-модуль Node (wget не входит в slim-образ)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8080/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/src/server.js"]
