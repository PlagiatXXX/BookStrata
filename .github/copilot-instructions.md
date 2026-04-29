# BookStrata Pro — Инструкции для AI Агентов

## 🎯 Обзор проекта

**BookStrata Pro** — полнофункциональное full-stack веб-приложение (React 19 + Fastify 5.7) для создания и управления интерактивными рейтингами книг (tier lists). Система поддерживает drag-and-drop редактирование, шаблоны, сообщество, лайки и AI-генерацию аватаров.

---

## 🏗️ Архитектура: Основные слои и разделение ответственности

### Frontend (`src/`) — React 19 + TypeScript 5.9
- **Vite** с HMR, **TailwindCSS 4**, **TanStack Query 5** для кэширования
- **Vite proxy** на `/api` → `http://localhost:8080` (backend)
- **Компоненты**: Атомарные UI компоненты в `src/ui`, бизнес-логика в отдельных компонентах
- **Состояние**: Redux-like reducer в `useTierList` хуке + React Context для Auth
- **API клиенты**: Модульные (`tierListApi.ts`, `authApi.ts`, `userApi.ts`, и т.д.) в `src/lib`

### Backend (`backend/src/`) — Fastify 5.7 + TypeScript
- **Модульная архитектура**: `/modules/{feature}/*.{route,service,schema}.ts`
- **Service Pattern**: Вся бизнес-логика в `.service.ts` классах, контроллеры в `.route.ts` тонкие
- **Prisma ORM** для типобезопасной работы с PostgreSQL
- **Zod** для валидации схем на уровне API
- **Plugins**: Auth (`plugins/auth.ts`), Logger, RequestContext, ErrorNotifier (Telegram)

### Общие типы (`shared/types.ts`)
Хранят типы, используемые и фронтенд, и бэкенд, чтобы гарантировать консистентность.

---

## 📋 Критические рабочие процессы и команды

### Запуск разработки
```bash
# Терминал 1 (Frontend на :5173)
npm install
npm run dev

# Терминал 2 (Backend на :8080)
cd backend
npm install
npm run dev
```

### Инициализация БД
```bash
cd backend
npx prisma migrate dev        # Создаёт миграцию и применяет её
npx prisma db seed           # Заполняет тестовыми данными (seed.ts)
```

### Тестирование
```bash
npm run test                  # Запуск тестов (Vitest)
npm run test:ui              # Интерактивный UI
npm run test:coverage        # Coverage отчёт
cd backend && npm run test   # Backend тесты
```

### Сборка
```bash
npm run build                 # Frontend: tsc + vite build
cd backend && npm run build   # Backend: prisma generate + tsc
```

---

## 🔑 Ключевые узлы и паттерны

### 1. Управление состоянием Tier List (`src/hooks/useTierList.ts`)
- **Redux-like редьюсер** с ~15 типами действий для манипуляции структурой данных
- **Оптимистичные обновления** для instant UI feedback при перемещении книг
- **Debounce** для автосохранения (~2 сек задержки перед отправкой на сервер)
- **Ключевые действия**:
  - `REORDER_ITEMS` — перемещение книг между тирами (drag-and-drop)
  - `ADD_ROW` / `REMOVE_ROW` — управление тирами
  - `REPLACE_BOOK_IDS` / `REPLACE_TIER_IDS` — маппинг временных ID на реальные после сохранения

### 2. Аутентификация и управление сессией (`src/contexts/AuthContext.tsx`)
- **JWT токены**: Сохраняются в `localStorage`, отправляются в заголовке `Authorization: Bearer <token>`
- **Auto-refresh**: При получении 401 `authApi.handleResponse()` автоматически обновляет токен
- **Ленивая загрузка пользователя**: `fetchUser()` вызывается один раз при загрузке приложения
- **Role-based access**: Поле `role` в `User` для контроля доступа (`AdminGuard`, `ProtectedRoute`)

### 3. API клиенты в `src/lib/`
- **Модульный паттерн**: Каждый домен имеет свой клиент (`tierListApi.ts`, `authApi.ts`, `avatarApi.ts`)
- **Базовый URL**: `API_BASE_URL` из `config.ts` → `${VITE_API_URL}/api`
- **Общий `apiClient`**: Инкапсулирует логику retry и auth в `api-client.ts`
- **Типизация**: Типы в `src/types/api.ts` описывают все REST responses

### 4. Модульная архитектура Backend
```
backend/src/modules/
├── auth/
│   ├── auth.route.ts      # POST /api/auth/register, /login, /logout
│   ├── auth.service.ts    # Бизнес-логика (JWT, bcrypt)
│   └── auth.schema.ts     # Zod схемы валидации
├── tier-lists/
│   ├── tierList.route.ts  # GET/POST/PUT /api/tier-lists
│   ├── tierList.service.ts
│   └── tierList.schema.ts
└── [other-modules...]
```
- **Services** инкапсулируют Prisma запросы и бизнес-логику
- **Routes** валидируют input, вызывают сервис, возвращают JSON
- **Schemas** определены в Zod для runtime типобезопасности

### 5. Базовая модель данных (Prisma)
```prisma
User → TierList → Tier → BookPlacement ← Book
```
- **BookPlacement** — связующая таблица (tierListId, bookId, tierId, rank)
- **Каскадное удаление**: При удалении TierList все Tiers и BookPlacements удаляются
- **Индексы**: На (tierListId, rank) для быстрого упорядочивания

---

## ⚠️ Критические подводные камни

### 1. Синхронизация Drag-and-Drop
**Проблема**: Быстрые движения мышью могут десинхронизировать фронтенд-состояние с сервером.
**Решение**: 
- Используйте `useAutoSaveOptimized` с debounce (~2 сек)
- Не отправляйте каждый `onDragEnd` — группируйте изменения
- При конфликте сервер побеждает (полная перезагрузка данных)

### 2. Google Books API квоты
**Проблема**: Бесплатный уровень имеет лимит ~1000 запросов/день.
**Решение**: 
- Проксируйте запросы через бэкенд (не прямо из браузера)
- Кэшируйте результаты в Prisma (модель `Book`)
- Реализуйте rate-limiting на endpoint `POST /api/books/search`

### 3. Временные ID при создании (Frontend → Backend)
**Проблема**: При быстром добавлении нескольких книг frontend использует UUID, backend возвращает integer.
**Решение**: 
- `useTierList` хук хранит временные ID в состоянии
- При получении ответа вызывается `REPLACE_BOOK_IDS` для маппинга `tempId → realId`
- Не используйте временные ID для последующих запросов

### 4. Cascade Delete в Prisma
**Помните**: `onDelete: Cascade` означает, что удаление TierList удалит все Tiers и BookPlacements.
Сначала проверяйте разрешение `userId` перед удалением.

### 5. JWT Secret на Frontend
**⚠️ SECURITY**: `VITE_API_URL` встраивается в клиентский бандл (виден в DevTools).
**Это ОК для URL**, но НИКОГДА не встраивайте секретные ключи.
**Защита**: CORS, rate-limiting на сервере, HTTPS в продакшене.

---

## 🧪 Тестирование и Валидация

### Frontend тесты (`src/**/*.test.ts`)
- **Vitest** + **React Testing Library**
- Примеры: `useTierList.test.ts` (тестирует редьюсер), компоненты
- Запуск: `npm run test` (watch mode), `npm run test:coverage`

### Backend тесты (`backend/src/**/*.test.ts`)
- **Supertest** для HTTP тестирования
- Примеры: валидация Zod схем, сервис логика
- Запуск: `cd backend && npm run test`

### Валидация API
- **Zod schemas** в `*.schema.ts` файлах определяют входящие данные
- **FastAPI автоматически** отвергает invalid requests (400 Bad Request)
- **Всегда валидируйте на бэкенде**, даже если фронтенд уже проверил

---

## 📊 Логирование

### Frontend логгер (`src/lib/logger.ts`)
```typescript
const logger = createLogger("ModuleName", { color: "cyan" });
logger.info("Message", { data: "context" });
logger.error("Error", { error: err.message });
```
- **Цвета**: cyan, blue, magenta, purple и т.д. для консоли
- **В продакшене**: может отправлять логи на сервер (`sendToServer: true`)

### Backend логгер (Fastify + Pino)
```typescript
fastify.log.info({ msg: "Message", data: "context" });
```
- **Структурированное логирование** (JSON в продакшене)
- **Telegram notifications** для критических ошибок через `errorNotifier.ts`

---

## 🚀 Типичные разработки

### Добавление нового модуля API (Backend)
1. Создайте папку `backend/src/modules/feature/`
2. Создайте `feature.route.ts`, `feature.service.ts`, `feature.schema.ts`
3. Экспортируйте `featureRoutes` из route.ts
4. Зарегистрируйте в `backend/src/server.ts`: `await fastify.register(featureRoutes)`
5. Добавьте Prisma модель в `schema.prisma` и запустите миграцию

### Добавление нового API клиента (Frontend)
1. Создайте `src/lib/featureApi.ts` с типами и функциями
2. Используйте `apiClient.get/post/put/delete` для запросов
3. Типы из `src/types/api.ts` (или создайте `src/types/feature.ts`)
4. Используйте в компонентах: `import { apiFunction } from '@/lib/featureApi'`

### Добавление компонента UI
1. Создайте папку в `src/components/ComponentName/`
2. `index.tsx` — экспорт компонента
3. `ComponentName.tsx` — основной файл
4. `ComponentName.test.tsx` — тесты (если важно)
5. Стили: используйте TailwindCSS или CSS modules для специфичных стилей

### Обновление Prisma Schema
1. Отредактируйте `backend/prisma/schema.prisma`
2. Запустите `cd backend && npx prisma migrate dev --name descriptive_name`
3. Проверьте сгенерированный файл в `backend/prisma/migrations/`
4. Типы Prisma Client автоматически обновляются

---

## 📚 Ключевые файлы для справки

| Файл | Назначение |
|------|-----------|
| `src/hooks/useTierList.ts` | Redux-like state management для tier list редактора |
| `src/contexts/AuthContext.tsx` | JWT auth + user session management |
| `src/lib/api-client.ts` | Базовый HTTP клиент с retry логикой |
| `backend/src/server.ts` | Fastify инициализация, регистрация плагинов/маршрутов |
| `backend/prisma/schema.prisma` | Database schema с индексами и связями |
| `tailwind.config.ts` | Кастомные цвета (primary, accent-blue, и т.д.) |
| `vite.config.ts` | Vite конфигурация с `/api` прокси |
| `.env.example` / `backend/.env.example` | Переменные окружения (скопируйте в .env) |

---

## 🎨 Соглашения проекта

- **Типизация**: Strict mode, полная типизация бизнес-логики (без `any` где возможно)
- **Компоненты**: Разделение на "presentational" (UI) и "container" (state-aware)
- **Файлы**: Kebab-case для файлов, CamelCase для экспортов
- **Импорты**: Используйте путь `@/` alias вместо относительных путей
- **Логи**: Создавайте логгер один раз в модуле, передавайте контекст в каждый вызов
- **Git**: Commitizen для сообщений (optional), feature branches `feature/description`

---

## 🔍 Быстрая диагностика

| Проблема | Решение |
|----------|---------|
| Vite не находит `/api` | Проверьте `vite.config.ts` proxy: `target: "http://localhost:8080"` |
| 401 Unauthorized | Проверьте JWT токен в localStorage, может быть истёк |
| CORS ошибка | Проверьте `CLIENT_URL` в `.env` backend, включите origin в `@fastify/cors` |
| Prisma: "UNIQUE constraint failed" | Добавьте `@unique` index в schema.prisma, запустите миграцию |
| Книги не сохраняются | Проверьте `useAutoSaveOptimized` debounce, откройте сетевые запросы в DevTools |
| Компонент перерисовывается много раз | Добавьте `useMemo` / `useCallback`, используйте `React.memo` для дорогих компонентов |

---

## 📞 Ссылки и документация

- **Архитектура**: `docs/ARCHITECTURE.md`
- **API Reference**: `backend/SWAGGER_DOCS.md` (доступна на `/docs` при запуске)
- **Logger Docs**: `docs/LOGGER.md`
- **File Manifest**: `docs/FILE_MANIFEST.md`
- **Business Plan**: `TierMaker-Pro-Business-Plan.txt`
- **Telegram Bot Setup**: `backend/TELEGRAM_SETUP.md`

---

**Последнее обновление**: 28 апреля 2026
**Версия**: BookStrata Pro v0.0.0
