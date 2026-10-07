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
│   ├── auth.spec.ts           # 8 сценариев — регистрация, вход, выход, неверные креды, cookies
│   ├── tier-lists.spec.ts     # 7 сценариев — CRUD тир-листов, лайки, лимиты
│   ├── profile.spec.ts        # 4 сценария — просмотр, username, пароль, аватарка (skip)
│   ├── admin.spec.ts          # 3 сценария — доступ, запрет для user, управление
│   ├── battles.spec.ts        # 2 сценария — просмотр, голосование
│   ├── discussions.spec.ts    # 2 сценария — просмотр, создание топика
│   ├── subscriptions.spec.ts  # 1 сценарий  — статус подписки
│   ├── templates.spec.ts      # 2 сценария — просмотр, использование шаблона
│   ├── search.spec.ts         # 1 сценарий  — главная страница
│   ├── responsive.spec.ts     # 8 сценариев — 4 вьюпорта × 2 страницы (horizontal scroll)
│   └── auth/                  # Расширенные auth-тесты (RBAC, токены, сессии) — 14 файлов
│       ├── anonymous-access.spec.ts       # доступ анонимных пользователей
│       ├── authorized-permissions.spec.ts # права авторизованных
│       ├── registration.spec.ts           # регистрация
│       ├── login-validation.spec.ts       # валидация входа
│       ├── logout-mechanics.spec.ts       # выход
│       ├── token-lifecycle.spec.ts        # жизненный цикл токена
│       ├── token-validation.spec.ts       # валидация токена
│       ├── refresh-mechanics.spec.ts      # refresh-токены
│       ├── session-expiry.spec.ts         # истечение сессии
│       ├── multi-tab.spec.ts              # мульти-таб и гонки
│       ├── rbac.spec.ts                   # role-based access control
│       ├── password-reset.spec.ts         # восстановление пароля
│       ├── rate-limiting.spec.ts          # rate limiting
│       └── error-handling.spec.ts         # ошибки и edge cases
└── reports/                   # HTML-отчёты (создаются после прогона)
```

**Итого: 121 тест, 24 файла.**

## Хелперы

- `loginViaApi(context, user)` — логин через API, ставит токен в localStorage
- `loginViaUI(page, user)` — логин через форму, ждёт редирект на dashboard
- `logoutViaUI(page)` — выход через кнопку + модал подтверждения
- `waitForSessionExpired(page)` — ждёт overlay «Сессия истекла»
- `apiRequest(method, path, token?, body?)` — авторизованный API-запрос
- `createTierList(token, title)` / `deleteTierList(id, token)` — CRUD через API
