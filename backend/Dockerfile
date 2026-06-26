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

# --- Используем Debian-based slim вместо Alpine ---
# Alpine требует openssl1.1-compat из community-репозитория для Prisma,
# а на сервере DNS на Alpine-репозитории недоступен.
# Debian имеет OpenSSL из коробки.

# ---------- Stage 1: Builder ----------
FROM node:20-slim AS builder

# Зеркало npm registry для ускорения на российских серверах
ENV npm_config_registry=https://registry.npmmirror.com
# Prisma engine binary mirror (тот же npmmirror)
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

WORKDIR /build

# Сначала только package.json — для кэширования слоя зависимостей
COPY package.json package-lock.json ./
# Явно указываем NODE_ENV=development, чтобы гарантировать установку
# dev-зависимостей (prisma CLI) — иначе при NODE_ENV=production npm ci
# пропустит пакеты с флагом devOptional в package-lock.json
RUN NODE_ENV=development npm ci

# Prisma schema + генерация клиента
COPY prisma/ ./prisma/
# Используем --no-install, чтобы npx не пытался скачать пакет из registry
# (prisma уже установлен через npm ci на предыдущем шаге)
RUN npx --no-install prisma generate

# Исходники + компиляция
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ---------- Stage 2: Production ----------
FROM node:20-slim AS production

ENV npm_config_registry=https://registry.npmmirror.com
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

RUN groupadd -g 1001 appgroup && \
    useradd -m -u 1001 -g appgroup appuser

WORKDIR /app

# Устанавливаем только production-зависимости
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --maxsockets=1 && \
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

# Healthcheck через встроенный http-модуль Node (wget не входит в slim-образ)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8080/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/src/server.js"]
