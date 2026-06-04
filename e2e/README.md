# E2E тесты (Playwright)

## Требования

- Backend на `http://localhost:8080` (с отдельной тестовой БД)
- Frontend на `http://localhost:5173`

## Быстрый старт

```bash
# 1. Установить браузеры Playwright
npx playwright install chromium

# 2. Запустить backend с тестовой БД
cd backend && cp .env.example .env
# Отредактируйте .env под тестовую БД (DATABASE_URL, JWT_SECRET и т.д.)
npm run dev

# 3. В другом терминале — фронтенд
npm run dev

# 4. Запустить E2E тесты
npm run test:e2e

# С UI-режимом
npm run test:e2e:ui
```

## Переменные окружения

Перед запуском убедитесь, что в `.env.test` (backend) указаны:

```
DATABASE_URL="postgresql://bookstrata:bookstrata_pass@localhost:5432/bookstrata_test"
JWT_SECRET="test-secret-key-for-integration-tests"
CLIENT_URL=http://localhost:5173
DISABLE_EMAIL_VERIFICATION=true
RATE_LIMIT_REGISTER_MAX=1000
```

## Структура

```
e2e/
├── playwright.config.ts    # Конфиг Playwright
├── global-setup.ts         # Сидирование пользователей перед тестами
├── .auth/                  # Storage state (создаётся автоматически)
│   ├── admin.json
│   └── user.json
├── fixtures/
│   └── test-data.ts        # Тестовые константы
├── mocks/
│   └── api-routes.ts       # Перехват внешних API
├── specs/
│   ├── auth.spec.ts        # 6 сценариев
│   ├── tier-lists.spec.ts  # 10 сценариев
│   ├── profile.spec.ts     # 4 сценария
│   ├── admin.spec.ts       # 5 сценариев
│   ├── battles.spec.ts     # 3 сценария
│   ├── discussions.spec.ts # 3 сценария
│   ├── subscriptions.spec.ts # 3 сценария
│   ├── templates.spec.ts   # 2 сценария
│   └── search.spec.ts      # 2 сценария
└── reports/                # HTML-отчёты (создаются после прогона)
```
