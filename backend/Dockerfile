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

# ---------- Stage 1: Builder ----------
FROM node:20-alpine AS builder

WORKDIR /build

# Сначала только package.json — для кэширования слоя зависимостей
COPY package.json package-lock.json ./
# Явно указываем NODE_ENV=development, чтобы гарантировать установку
# dev-зависимостей (prisma CLI) — иначе при NODE_ENV=production npm ci
# пропустит пакеты с флагом devOptional в package-lock.json
RUN NODE_ENV=development npm ci

# Prisma schema + генерация клиента
COPY prisma/ ./prisma/
RUN npx prisma generate

# Исходники + компиляция
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ---------- Stage 2: Production ----------
FROM node:20-alpine AS production

RUN apk add --no-cache openssl 2>/dev/null || true && \
    addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Устанавливаем только production-зависимости
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# Копируем собранный код и сгенерированный Prisma-клиент
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules/.prisma ./node_modules/.prisma
# Prisma schema нужен runtime для migrate deploy
COPY prisma/ ./prisma/
COPY --from=builder /build/node_modules/@prisma/client ./node_modules/@prisma/client

# Скрипты (миграции, утилиты)
COPY scripts/ ./scripts/
COPY tsconfig.json ./

# Запускаем от непривилегированного пользователя
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["node", "dist/src/server.js"]
