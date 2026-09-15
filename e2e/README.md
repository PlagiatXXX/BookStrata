# E2E тесты (Playwright)

## Требования

- Backend на `http://localhost:8080` (с отдельной тестовой БД)
- Frontend на `http://localhost:5173`

## Быстрый старт

```bash
# 1. Установить браузеры Playwright
npx playwright install chromium

# 2. Поднять тестовую БД
cd backend && docker compose up -d postgres

# 3. Запустить backend с тестовой БД
cd backend && cp .env.example .env
# Отредактируйте .env под тестовую БД (DATABASE_URL, JWT_SECRET и т.д.)
npm run dev

# 4. В другом терминале — фронтенд
npm run dev

# 5. Запустить E2E тесты
npm run test:e2e

# С UI-режимом
npm run test:e2e:ui
```

## Переменные окружения

Перед запуском убедитесь, что в `.env` (backend) указаны:

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
├── playwright.config.ts       # Конфиг Playwright (testDir: ./e2e/specs)
├── global-setup.ts            # Сидирование пользователей + повышение админа
├── global-teardown.ts         # Очистка после прогона
├── .auth/                     # Storage state (создаётся автоматически)
│   ├── admin.json
│   └── user.json
├── fixtures/
│   └── test-data.ts           # Константы: USERS, ROUTES, MOCK_BOOK
├── mocks/
│   └── api-routes.ts          # Моки внешних API (Google Books, AI, RSS, forgot-password)
├── helpers/
│   ├── auth.ts                # loginViaApi, loginViaUI, logoutViaUI, waitForSessionExpired
│   └── api.ts                 # apiRequest, createTierList, getTierList, deleteTierList
├── specs/
│   ├── auth.spec.ts           # 6 сценариев — регистрация, вход, выход, неверные креды
│   ├── tier-lists.spec.ts     # 7 сценариев — CRUD тир-листов, лайки, лимиты
│   ├── profile.spec.ts        # 4 сценария — просмотр, username, пароль, аватарка (skip)
│   ├── admin.spec.ts          # 3 сценария — доступ, запрет для user, управление
│   ├── battles.spec.ts        # 2 сценария — просмотр, голосование
│   ├── discussions.spec.ts    # 2 сценария — просмотр, создание топика
│   ├── subscriptions.spec.ts  # 1 сценарий  — статус подписки
│   ├── templates.spec.ts      # 2 сценария — просмотр, использование шаблона
│   ├── search.spec.ts         # 1 сценарий  — главная страница
│   ├── responsive.spec.ts     # 8 сценариев — 4 вьюпорта × 2 страницы (horizontal scroll)
│   └── auth/                  # Расширенные auth-тесты (RBAC, токены, сессии)
│       ├── anonymous-access.spec.ts       # 6 — доступ анонимных пользователей
│       ├── authorized-permissions.spec.ts # 8 — права авторизованных
│       ├── token-lifecycle.spec.ts        # 5 — жизненный цикл токена
│       ├── session-expiry.spec.ts         # 5 — истечение сессии
│       ├── multi-tab.spec.ts              # 4 — мульти-таб и гонки
│       ├── rbac.spec.ts                   # 7 — role-based access control
│       └── error-handling.spec.ts         # 8 — ошибки и edge cases
└── reports/                   # HTML-отчёты (создаются после прогона)
```

**Итого: 73 теста, 16 файлов.**

## Хелперы

- `loginViaApi(context, user)` — логин через API, ставит токен в localStorage
- `loginViaUI(page, user)` — логин через форму, ждёт редирект на dashboard
- `logoutViaUI(page)` — выход через кнопку + модал подтверждения
- `waitForSessionExpired(page)` — ждёт overlay «Сессия истекла»
- `apiRequest(method, path, token?, body?)` — авторизованный API-запрос
- `createTierList(token, title)` / `deleteTierList(id, token)` — CRUD через API
