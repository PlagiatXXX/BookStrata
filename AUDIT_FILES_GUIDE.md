# AUDIT FILES GUIDE — BookStrata Pro

**Создано**: 20 мая 2026  
**Статус**: Полный аудит архитектуры, карта проекта и план скиллов

---

## 1. Обзор проекта

BookStrata Pro (TierMaker Pro) — full-stack приложение для создания рейтингов книг (tier lists).

| Слой | Технологии | Порт |
|------|------------|------|
| Frontend | React 19 + Vite 7 + TypeScript 5.9 + TailwindCSS 4 | `:5173` |
| Backend | Fastify 5.7 + Prisma 4.16 + Zod 4 | `:8080` |
| Database | PostgreSQL 14+ | |
| Cache | Redis (опционально) | |
| Shared | `shared/types.ts` — общие типы | |

---

## 2. Карта проекта

### 2.1 Фронтенд (`src/`)

```
src/
├── app/                    # Точка входа, роутер
│   ├── App.tsx             # AppShell (хедер + футер + outlet)
│   ├── main.tsx            # Entry point
│   └── router.tsx          # React Router (ленивая загрузка)
│
├── pages/                  # 16 страниц
│   ├── AuthPage.tsx                        # Вход/регистрация
│   ├── ForgotPasswordPage.tsx              # Восстановление пароля
│   ├── ResetPasswordPage.tsx               # Сброс пароля
│   ├── DashboardPage/                      # Дашборд (CRUD тир-листов)
│   ├── TierListEditorPage/                 # Редактор тир-листов (DnD)
│   ├── ProfilePage/                        # Профиль, ачивки, статистика
│   ├── CreateTemplatePage.tsx              # Создание шаблона
│   ├── EditTemplatePage.tsx                # Редактирование шаблона
│   ├── CommunityPage/                      # Сообщество (лента)
│   ├── CollectionPage/                     # Коллекция
│   ├── ForumPage/                          # Форум (баттлы)
│   ├── NewsPage/                           # Новости
│   ├── AdminDashboard/                     # Админка (главная)
│   ├── AdminNewsPage/                      # Админка (новости)
│   ├── AdminCollectionsPage/               # Админка (коллекции)
│   └── AdminSubscriptionsPage/             # Админка (подписки)
│
├── components/             # Переиспользуемые компоненты (26 папок)
│   ├── TierGrid/           # Сетка тиров (DnD-зона)
│   ├── TierRow/            # Строка тира
│   ├── UnrankedItems/      # Неранжированные книги
│   ├── SortableBookCover/  # Обложка с DnD
│   ├── BookEditModal/      # Редактирование книги
│   ├── BookViewModal/      # Просмотр книги
│   ├── BookSearchModal/    # Поиск книг
│   ├── BookCounter/        # Счётчик книг
│   ├── EditorModals/       # Модалки редактора (7 шт)
│   ├── EditorScreens/      # Экран загрузки/ошибки
│   ├── AuthForm/           # Форма логина/регистрации
│   ├── ProtectedRoute/     # Guard авторизации
│   ├── AdminGuard/         # Guard админ-роли
│   ├── Avatar/             # Система аватаров (AI, upload, presets)
│   ├── TemplateCard/       # Карточка шаблона
│   ├── TemplateBuilder/    # Билдер шаблонов
│   ├── TemplateEditor/     # Визард шаблона (3 шага)
│   ├── TemplateLibrary/    # Библиотека шаблонов
│   ├── CommunityComponents/ # Компоненты сообщества
│   ├── DashboardHeroSection/ # Герой дашборда
│   ├── SearchBar/          # Поиск
│   ├── SettingsSidebar/    # Боковая панель настроек
│   ├── LikeButton/         # Кнопка лайка
│   ├── Spinner/            # Индикатор загрузки
│   ├── ImageUploader/      # Загрузка изображений
│   └── AchievementNotification/ # Уведомление об ачивке
│
├── hooks/                  # React-хуки (11 файлов)
│   ├── useTierList.ts           # Редактор тир-листов (reducer, 15 action types)
│   ├── useAuthContext.ts        # Доступ к AuthContext
│   ├── useUser.ts               # TanStack Query: пользователь
│   ├── useBookSearch.ts         # Поиск книг (debounce, cache, infinite scroll)
│   ├── useDebounce.ts           # Debounce
│   ├── useAchievements.ts       # TanStack Query: ачивки
│   ├── useAchievementNotifications.ts # Уведомления ачивок (custom events)
│   ├── useTemplates.ts          # TanStack Query: шаблоны (CRUD)
│   ├── useTemplateEditorState.ts # Визард шаблонов (3 шага, черновики)
│   └── page-specific hooks      # Хуки страниц (TierEditorPage, DashboardPage, ProfilePage)
│
├── contexts/               # React-контексты
│   ├── auth.context.ts     # Типы AuthContext
│   └── AuthContext.tsx     # AuthProvider (JWT, события, синхронизация вкладок)
│
├── lib/                    # API-клиенты и инфраструктура (17 файлов)
│   ├── api-client.ts       # Базовый HTTP-клиент (retry, token refresh)
│   ├── authApi.ts          # Аутентификация (register, login, refresh, reset)
│   ├── userApi.ts          # Пользователи (me, avatar, stats)
│   ├── avatarApi.ts        # AI-генерация аватаров
│   ├── tierListApi.ts      # CRUD тир-листов (самый объёмный)
│   ├── bookSearchApi.ts    # Поиск книг (Google Books, Open Library)
│   ├── collectionsApi.ts   # Коллекции (mock)
│   ├── likesApi.ts         # Лайки
│   ├── newsApi.ts          # Новости
│   ├── achievementApi.ts   # Ачивки (+ handleAchievementResponse)
│   ├── battlesApi.ts       # Баттлы
│   ├── templateTransformer.ts # Трансформеры API→State
│   ├── config.ts           # API_BASE_URL
│   ├── storage.ts          # localStorage абстракция
│   ├── logger.ts           # Контекстный логгер (sendBeacon)
│   ├── logger.spec.ts      # Тесты логгера
│   └── achievementApi.spec.ts # Тесты ачивок
│
├── ui/                     # UI-kit (базовые компоненты, 17 файлов)
│   ├── BookCover.tsx       # Обложка книги
│   ├── Button.tsx          # Кнопка
│   ├── Card.tsx            # Карточка
│   ├── ConfirmModal.tsx    # Модалка подтверждения
│   ├── Footer.tsx          # Футер
│   ├── Header.tsx          # Хедер (навигация, поиск, пользователь)
│   ├── Input.tsx           # Поле ввода
│   ├── Logo.tsx            # Логотип
│   ├── Modal.tsx           # Базовая модалка
│   ├── Pagination.tsx      # Пагинация
│   ├── RainEffect.tsx      # Декоративный эффект
│   ├── Skeleton.tsx        # Скелетон
│   ├── Switch.tsx          # Переключатель
│   ├── Textarea.tsx        # Текстовое поле
│   ├── TierLabel.tsx       # Лейбл тира
│   └── spec-файлы          # Тесты компонентов
│
├── utils/                  # Утилиты
│   ├── colorUtils.ts       # Цветовые утилиты (контраст, luminance)
│   ├── id.ts               # Генерация UUID
│   ├── saveDiff.ts         # Diff-based payload для атомарного сохранения
│   └── id.test.ts          # Тесты
│
├── types/                  # TypeScript типы (7 файлов)
│   ├── index.ts            # Основные типы (Book, Tier, TierListData)
│   ├── api.ts              # API-типы (ApiBook, ApiTier, ApiTemplate...)
│   ├── auth.ts             # AuthResponse, User, AdminUser
│   ├── battles.ts          # Battle, BattleParticipant
│   ├── logger.ts           # LogLevel, Logger, LogPayload
│   ├── templateEditor.ts   # TemplateEditorFormState
│   └── templates.ts        # Template, TierTemplate, BookTemplate
│
├── constants/              # Константы
│   ├── colors.ts           # TIER_COLORS (20 цветов)
│   ├── dnd.ts              # UNRANKED_AREA_ID
│   ├── limits.ts           # MAX_BOOKS_PER_TIER_LIST, MAX_TIERS_PER_LIST и др
│   └── pagination.ts       # PAGE_SIZE, STALE_TIME, GC_TIME
│
├── data/                   # Mock-данные
│   └── mockData.ts         # TEMPLATES, CATEGORIES, COLLECTIONS, NEWS
│
├── layouts/                # Лейауты
│   └── DashboardLayout/    # Основной лейаут (Header + main + Footer)
│
└── test/                   # Тестовая конфигурация
    └── setup.ts            # Установка happy-dom, matchMedia mock
```

### 2.2 Бэкенд (`backend/`)

```
backend/src/
├── server.ts               # Точка входа (Fastify, плагины, роуты)
├── swagger.ts              # OpenAPI конфигурация
│
├── lib/                    # Инфраструктура (9 файлов)
│   ├── api-response.ts     # Стандартизация ответов (ErrorCodes, createApiError)
│   ├── cache.ts            # Redis-кэширование (get/set/delete/clearPattern)
│   ├── cloudinary.ts       # Cloudinary (uploadAvatar, deleteAvatar, uploadBase64)
│   ├── errorNotifier.ts    # Telegram error notifier (троттлинг 5s)
│   ├── logger.ts           # Контекстный логгер (ANSI, JSON в production)
│   ├── mailer.ts           # Nodemailer (SMTP, pool connections)
│   ├── prisma.ts           # Prisma Client (retry, health-check, waitForDatabase)
│   ├── redis.ts            # Redis Client (ioredis, rate-limit store)
│   └── sanitizer.ts        # XSS-санитизация (sanitize-html)
│
├── plugins/                # Fastify-плагины (3 файла)
│   ├── auth.ts             # JWT верификация (onRequest hook)
│   ├── logFromFrontend.ts  # POST /api/log (прокси логов с фронта)
│   └── requestContext.ts   # RequestId, duration логирование
│
├── middleware/              # Middleware (2 файла)
│   ├── proLimit.ts         # Pro-лимиты (checkProLimit, requirePro, checkBookLimit)
│   └── requireRole.ts      # Проверка ролей (admin/moderator/user)
│
├── utils/                  # Утилиты (1 файл)
│   └── slugify.ts          # Транслитерация, генерация slug
│
├── types/                  # Типы (2 файла)
│   ├── fastify.d.ts        # FastifyInstance.prisma, FastifyRequest.user
│   └── logger.ts           # LogLevel, Logger, LoggerConfig
│
├── modules/                # 11 модулей (route + service + schema)
│   ├── auth/               # Аутентификация (6 файлов)
│   │   ├── auth.route.ts       # POST register, login, validate, refresh, forgot-password, reset-password
│   │   ├── auth.service.ts     # bcrypt, JWT (15min access, 7d refresh)
│   │   ├── auth.schema.ts      # Zod-схемы
│ │   ├── auth.mail.ts      # HTML-шаблоны писем
│   │   ├── auth.middleware.ts  # authMiddleware (401 guard)
│   │   └── auth.service.spec.ts
│   │
│   ├── users/              # Пользователи (3 файла)
│   │   ├── users.route.ts      # GET/PUT me, stats, avatar, password
│   │   ├── users.service.ts    # CRUD, статистика, админ-список
│   │   └── users.service.spec.ts
│   │
│   ├── avatars/            # Аватары (4 файла)
│   │   ├── avatar.route.ts     # POST generate, upload, GET limit
│   │   ├── avatar.service.ts   # Pollinations AI, Cloudinary, лимиты
│   │   ├── avatar.schema.ts    # Zod-схемы
│   │   └── avatar.service.spec.ts
│   │
│   ├── books/              # Поиск книг (5 файлов)
│   │   ├── books.route.ts      # GET search?q=&startIndex=
│   │   ├── books.service.ts    # Google Books API, кэш 24h, retry
│   │   ├── books.schema.ts     # JSON-схемы
│   │   ├── books.service.spec.ts
│   │   └── books.service.trim.spec.ts
│   │
│   ├── tier-lists/         # Тир-листы (11+ файлов, ядро)
│   │   ├── tierList.route.ts   # ~17 эндпоинтов
│   │   ├── tierList.service.ts # 1122 строки, CRUD, saveAll, fork
│   │   ├── tierList.schema.ts  # Zod + JSON схемы
│   │   ├── likes/              # Лайки (route + service + spec)
│   │   └── spec-файлы          # 7 файлов тестов (BOLA, интеграционные)
│   │
│   ├── news/               # Новости (3 файла)
│   │   ├── news.route.ts       # CRUD + publish
│   │   ├── news.service.ts     # Пагинация, XSS-санитизация
│   │   └── news.security.spec.ts
│   │
│   ├── roles/              # Роли (2 файла)
│   │   ├── roles.route.ts      # GET roles, PUT назначение
│   │   └── roles.service.ts    # CRUD ролей
│   │
│   ├── subscriptions/      # Подписки (2 файла)
│   │   ├── subscriptions.routes.ts # GET stats, set-status, activate/deactivate
│   │   └── subscriptions.service.ts # Pro-подписки, истечение
│   │
│   ├── battles/            # Битвы (3 файла)
│   │   ├── battles.route.ts    # GET active, POST vote, close
│   │   ├── battles.service.ts  # Голосование, победитель, XP
│   │   └── battles.schema.ts   # Zod-схемы
│   │
│   ├── templates/          # Шаблоны (5+ файлов)
│   │   ├── templates.plugin.ts  # Fastify-плагин
│   │   ├── templates.controller.ts # CRUD + use
│   │   ├── templates.service.ts    # Лимиты, транзакции
│   │   ├── templates.service.spec.ts
│   │   └── likes/               # Лайки шаблонов
│   │
│   └── achievements/       # Достижения (3 файла)
│       ├── achievements.route.ts # GET me, status, seed
│       ├── achievements.service.ts # 28 ачивок, 18 титулов, XP
│       └── achievements.service.spec.ts
│
├── scripts/                # Скрипты
│   └── seedAchievements.ts # Синхронизация ачивок
│
└── test/                   # Тестовая конфигурация
```

### 2.3 База данных (Prisma)

**13 моделей**: User, Book, TierList, Tier, BookPlacement, Template, Battle, BattleParticipant, BattleVote, TierListLike, TemplateLike, NewsArticle, Role, PasswordResetToken, Achievement, UserAchievement

---

## 3. План скиллов по доменам

### 3.1 Бэкенд-скиллы

| # | Скилл | Домен | Описание |
|---|-------|-------|----------|
| 1 | **backend-auth** | Аутентификация | JWT access/refresh, bcrypt, rate limiting, forgot/reset password, httpOnly cookies |
| 2 | **prisma-best-practices** | База данных | Модели, индексы, миграции, транзакции, retry, N+1 prevention |
| 3 | **redis-caching** | Кэширование | Стратегии TTL, graceful degradation, cache invalidation, rate-limit store |
| 4 | **file-upload** | Файлы/изображения | Cloudinary, base64, crop/resize, AI генерация, лимиты, оптимизация |
| 5 | **api-security** | Безопасность | BOLA-тесты, XSS-санитизация, Helmet CSP, requireRole, проверка владельца |
| 6 | **achievements-gamification** | Геймификация | Event-driven ачивки, XP, титулы, secret achievements, ретро-синхронизация |
| 7 | **subscription-limits** | Подписки | Pro/Free tiered limits, middleware, expiration, paywall logic |
| 8 | **external-api-integration** | Внешние API | Google Books, Open Library, retry, кэширование, дедупликация, quota management |
| 9 | **logging-observability** | Мониторинг | Request context, duration logging, Telegram notifier, structured logs |
| 10 | **atomic-db-operations** | Транзакции | Diff-based save, tempId→realId маппинг, partial updates, конкурентность |
| 11 | **tournament-system** | Баттлы | Голосование, winners, XP rewards, race conditions, anti-cheat |
| 12 | **api-response-envelope** | API дизайн | Стандартизация `{ data, error, meta, links }` — расширение api-design |

### 3.2 Фронтенд-скиллы

| # | Скилл | Домен | Описание |
|---|-------|-------|----------|
| 13 | **auth-forms** | Формы аутентификации | Login/Register/Forgot/Reset, валидация, loading/error states, JWT sync |
| 14 | **dnd-editor** | Drag-and-Drop | @dnd-kit core/sortable, useReducer (15 action types), optimistic updates |
| 15 | **data-fetching-react-query** | Запросы данных | TanStack Query patterns, staleTime, cache invalidation, optimistic mutations |
| 16 | **api-client-architecture** | HTTP клиент | Retry, token refresh, achievement interception, handleResponse |
| 17 | **state-management** | Управление состоянием | Когда useReducer vs Context vs React Query, антипаттерны |
| 18 | **multi-step-wizard** | Визарды | Template wizard (3 шага), auto-save drafts, beforeunload, per-step validation |
| 19 | **ui-component-library** | UI-kit | Button, Modal, Input, Card, Skeleton, Pagination, Switch — конвенции |
| 20 | **search-with-debounce** | Поиск | AbortController, IntersectionObserver, infinite scroll, localStorage cache |
| 21 | **achievement-notifications** | Уведомления | Custom events, global trigger, animated notifications, cache invalidation chain |
| 22 | **client-logger** | Логирование | createLogger, sendBeacon, log levels, цветной вывод |

### 3.3 Сквозные скиллы

| # | Скилл | Домен | Описание |
|---|-------|-------|----------|
| 23 | **testing-patterns** | Тестирование | Vitest, BOLA-тесты, supertest, React Testing Library, spec-файлы рядом с модулями |
| 24 | **error-handling** | Обработка ошибок | Единый формат, error boundaries, fallback UI, graceful degradation |
| 25 | **dnd-best-practices** | DnD доступность | @dnd-kit accessibility, touch support, keyboard navigation |

---

## 4. Приоритеты создания скиллов

### Фаза 1 (сейчас — ядро проекта)
1. **dnd-editor** — редактор тир-листов (самая сложная часть)
2. **backend-auth** + **auth-forms** — аутентификация (сквозная фича)
3. **prisma-best-practices** — вся БД
4. **achievements-gamification** + **achievement-notifications** — геймификация

### Фаза 2 (средний приоритет)
5. **data-fetching-react-query** + **api-client-architecture** — работа с сервером
6. **api-security** — BOLA, XSS, CSP
7. **subscription-limits** — Pro/Free
8. **file-upload** — аватары, обложки
9. **external-api-integration** — поиск книг

### Фаза 3 (инфраструктура)
10. **redis-caching** — кэширование
11. **logging-observability** + **client-logger**
12. **state-management**
13. **multi-step-wizard** — шаблоны
14. **tournament-system** — баттлы

### Фаза 4 (полировка)
15. **ui-component-library** — UI-kit конвенции
16. **search-with-debounce**
17. **testing-patterns**
18. **error-handling**
19. **dnd-best-practices**
20. **atomic-db-operations**
21. **api-response-envelope**

---

## 5. Структура каждого скилла

```
.opencode/skills/<skill-name>/
├── SKILL.md              # Краткое описание, workflow, правила
├── references/           # Примеры из проекта, антипаттерны, архитектура
├── evals/                # Тестовые сценарии (evals.json)
├── templates/            # Шаблоны кода (опционально)
└── scripts/              # Скрипты автоматизации (опционально)
```

---

## 6. Результаты аудита кода — найденные проблемы

**Дата**: 20 мая 2026  
**Метод**: Построчный анализ ключевых модулей (15 файлов, ~3500 строк)  
**Всего найдено**: 28 проблем

### 6.1 Классы проблем (для создания скиллов)

| # | Класс | Кол-во | Критичность | Потенциальный скилл |
|---|-------|--------|-------------|-------------------|
| A | **BOLA / IDOR** (непроверка владения ресурсами) | 4 | 🔴 Высокая | `bola-protection` |
| B | **Race Conditions** (состояния гонки) | 3 | 🔴 Высокая | `race-condition-prevention` |
| C | **API Response Envelope** (неконсистентность ответов) | 3 | 🟡 Средняя | `api-response-consistency` |
| D | **Achievements / Gamification** (логические ошибки) | 4 | 🟡 Средняя | `gamification-logic` |
| E | **ID Management** (смешанная система UUID/Int) | 4 | 🟡 Средняя | `id-system-consistency` |
| F | **Rate Limiting** (пропущенные эндпоинты) | 2 | 🟡 Средняя | `rate-limiting-patterns` |
| G | **Token Refresh Chain** (сложная цепочка) | 2 | 🟡 Средняя | `token-refresh-pattern` |
| H | **Large Payloads** (base64 изображения) | 2 | 🟢 Низкая | `large-payload-handling` |
| I | **Error Handling** (неполная обработка) | 2 | 🟢 Низкая | `prisma-error-handling` |
| J | **Frontend-Backend Sync** (десинхрон удаления) | 2 | 🟢 Низкая | `frontend-backend-consistency` |

---

### 6.2 Детальное описание проблем

#### Класс A: BOLA / IDOR (4 проблемы)

**A1. `updatePlacements` не проверяет ownership книг**
- **Файл**: `backend/src/modules/tier-lists/tierList.service.ts:181-236`
- **Суть**: Проверяется, что `tierId` принадлежат тир-листу, но `bookId` не проверяются. Можно вставить чужие книги в placements.
- **Риск**: Подмена книг в тир-листе

**A2. `removeBookFromTierList` не проверяет владельца в сервисе**
- **Файл**: `tierList.service.ts:379-406`
- **Суть**: Сервис ищет тир-лист, но если не нашёл — просто `return`. Не проверяет `userId` вообще.
- **Риск**: Удаление книг из чужих тир-листов (если роут не вызовет `assertOwner`)

**A3. `saveAll` проверяет ownership книг по всем тир-листам пользователя, а не по конкретному**
- **Файл**: `tierList.service.ts:1016-1027`
- **Суть**: `bookPlacement.count` ищет книги во всех тир-листах пользователя, а не в конкретном. Если книга лежит в другом тир-листе — она не пройдёт проверку, даже если владелец — тот же пользователь.
- **Риск**: Ложные срабатывания BOLA-защиты

**A4. `updateBook` и `updateBookCover` не вызывают `assertOwner`**
- **Файл**: `tierList.service.ts:307-376`
- **Суть**: Проверяют, что книга принадлежит тир-листу, но не проверяют, что тир-лист принадлежит пользователю (эту проверку ожидают от роута).
- **Риск**: Если роут забудет вызвать `assertOwner` — защита потеряна

---

#### Класс B: Race Conditions (3 проблемы)

**B1. Регистрация — проверка дубликатов через `findFirst` + `create` (не атомарно)**
- **Файл**: `backend/src/modules/auth/auth.service.ts:42-74`
- **Суть**: Между `findFirst({ where: { OR: [email, username] } })` и `prisma.user.create()` может пройти другой запрос с теми же данными. Нет транзакции или попытки создания с catch уникальности.
- **Риск**: Дубликаты пользователей при конкурентной регистрации
- **Как надо**: Пытаться создать сразу, ловить P2002 и выдавать понятную ошибку

**B2. Ачивки `processAction` всегда делает запросы к БД без блокировки**
- **Файл**: `backend/src/modules/achievements/achievements.service.ts:126-291`
- **Суть**: При конкурентном добавлении 10 книг — 10 раз будет вызван `processAction('add_book')`, каждый раз считающий `bookPlacement.count`. Нет мьютекса или очереди.
- **Риск**: Множественные выдачи ачивки (хотя `checkAndGrantAchievement` защищает через `findUnique`, лишние запросы)

**B3. Голосование в битвах без явной проверки перед транзакцией**
- **Файл**: `backend/src/modules/battles/battles.service.ts:110-156`
- **Суть**: Транзакция пытается создать `BattleVote`, unique constraint `[userId, battleId]` защищает, но если первый запрос уже создал голос — второй упадёт с Prisma error, которая не обрабатывается graceful.
- **Риск**: 500 ошибка при двойном голосовании вместо понятного сообщения

---

#### Класс C: API Response Envelope (3 проблемы)

**C1. `GET /:id` возвращает данные без обёртки `{ data: ... }`**
- **Файл**: `backend/src/modules/tier-lists/tierList.route.ts:283`
- **Суть**: `return tierList;` вместо `return reply.send({ data: tierList });`. Нарушает единый формат ответа.
- **Контраст**: Все остальные endpoints используют `{ data: ... }`

**C2. `DELETE /:id` возвращает `{ message }` вместо `{ data: { message } }`**
- **Файл**: `tierList.route.ts:328-330`
- **Суть**: `{ message: "Tier list deleted successfully" }` без обёртки `data`.

**C3. `createSuccessResponse` не используется (мёртвый код)**
- **Файл**: `backend/src/lib/api-response.ts:78-87`
- **Суть**: Функция определена, но ни один роут её не вызывает. Все используют `reply.send({ data: ... })` напрямую.

---

#### Класс D: Achievements / Gamification (4 проблемы)

**D1. `fighter_3` (Чемпион) — описание не соответствует логике**
- **Файл**: `achievements.service.ts:258-278` и `:345-346`
- **Описание**: "Выиграть 5 битв", но в коде выпадает за `winCount >= 1` (первая победа).
- **Исправить**: Либо описание ("Выиграть 1 битву"), либо условие (`winCount >= 5`)

**D2. Название ачивки `bookworm_5` совпадает с финальным титулом**
- **Файл**: `achievements.service.ts:331` (ачивка "Вселенский читатель") и `:34` (титул "Вселенский читатель")
- **Суть**: Дублирование имени при разных сущностях. Сбивает с толку.

**D3. `processAction('get_like')` — запрос при каждом лайке, хотя ачивки уже могли быть получены**
- **Файл**: `achievements.service.ts:197-216`
- **Суть**: Каждый лайк делает `tierListLike.count`, даже если пользователь уже получил `popular_4` (1000 лайков). Нет раннего выхода (early return) для уже полученных ачивок.

**D4. `syncUserAchievements` не включает `win_battle` и `fork`**
- **Файл**: `achievements.service.ts:309-320`
- **Суть**: `syncUserAchievements` перебирает действия, но `win_battle` и `fork` не включены. Ретро-синхронизация не полная.

---

#### Класс E: ID Management (4 проблемы)

**E1. `getTierListWhereClause` — логическая ошибка с числовыми ID**
- **Файл**: `tierList.service.ts:17-21`
- **Суть**: Если передан ID `"123"`, он не является UUID (не проходит `isUuid`), но проходит `/^\d+$/`, и поиск идёт по `{ id: "123" }`. Но `TierList.id` — это UUID (строка), а не число. Такой запрос всегда вернёт `null`.
- **Риск**: Если фронтенд пошлёт числовой ID (а он может, т.к. `saveAll` оперирует числами), сервер его не найдёт

**E2. `saveAll` не обрабатывает NaN при `parseInt` bookId**
- **Файл**: `tierList.service.ts:1078-1079`
- **Суть**: Если `bookId` — строка без "-" (например, "abc"), `parseInt` даст `NaN`, и запрос к БД упадёт.

**E3. `transformStateToApi` теряет новые книги и тиры**
- **Файл**: `src/lib/tierListApi.ts:351-389`
- **Суть**: Функция фильтрует только числовые ID (`toNumericId === null` → return). Книги с temp ID не включаются в placements.
- **Контраст**: `saveDiff.ts` делает наоборот — включает и temp, и numeric ID.
- **Риск**: Если кто-то использует `transformStateToApi` вместо `saveAll`, данные потеряются

**E4. Нет `deletedBookIds` в стейте (в отличие от `deletedTierIds`)**
- **Файл**: `src/hooks/useTierList.ts:262-296` и `src/utils/saveDiff.ts:99-108`
- **Суть**: При удалении книги нет механизма передать на сервер, что она должна быть удалена. Сервер при `saveAll` удаляет все placements и создаёт заново, но книга в БД остаётся (orphan record).
- **Риск**: Мусор в БД

---

#### Класс F: Rate Limiting (2 проблемы)

**F1. `/api/auth/refresh` не имеет rate limiting**
- **Файл**: `backend/src/modules/auth/auth.route.ts:137`
- **Суть**: Все auth endpoints имеют rate limit (register: 10/hour, login: 20/min, forgot-password: 5/hour), кроме refresh.

**F2. Нет rate limit на сброс пароля по токену**
- **Файл**: `auth.route.ts:205` — reset-password не имеет rateLimit config

---

#### Класс G: Token Refresh Chain (2 проблемы)

**G1. `handleAchievementResponse` парсит JSON ДО проверки статуса**
- **Файл**: `src/lib/achievementApi.ts:61-74`
- **Суть**: Вызывает `handleResponse`, который при 401 читает тело ответа (через `response.json()`), затем рефрешит токен и кидает `TOKEN_REFRESHED`. Тело ответа уже потреблено, но retry делает новый запрос — это ок. Проблема в том, что при не-401 ошибке `handleResponse` уже прочитал JSON, и если это 500, то ответ уже расшифрован.

**G2. Неконсистентность: `api-client.ts` использует `handleAchievementResponse`, а некоторые API (authApi.ts) используют `handleResponse` напрямую**
- **Файл**: `src/lib/authApi.ts:42-78` (register/login — ручной парсинг) vs `src/lib/api-client.ts:21-49` (автоматический)
- **Суть**: Два подхода к обработке ответов в разных API-модулях. authApi вручную парсит ошибки, tierListApi использует `handleAchievementResponse`.

---

#### Класс H: Large Payloads (2 проблемы)

**H1. Base64 изображения передаются в теле одного запроса**
- **Файл**: `src/hooks/useTierList.ts:571-604` и `backend/src/modules/tier-lists/tierList.route.ts:414-437`
- **Суть**: При добавлении книг через `addBooks`, файлы конвертируются в base64. 20 книг по 5MB = 100MB в одном запросе. Vite proxy и Fastify `bodyLimit: 10MB` — запрос упадёт.

**H2. Нет прогрессивной загрузки (chunked upload) для изображений**
- **Файл**: `backend/src/lib/cloudinary.ts`
- **Суть**: Изображения загружаются целиком.

---

#### Класс I: Prisma Error Handling (2 проблемы)

**I1. P2002 обрабатывается только для username, но не для email или slug**
- **Файл**: `backend/src/server.ts:146-155`
- **Суть**: Глобальный error handler при P2002 (unique constraint violation) всегда возвращает `USERNAME_TAKEN`, даже если конфликт по email.

**I2. Нет обработки других Prisma ошибок (P2025, P2014)**
- **Файл**: `server.ts:114-166`
- **Суть**: Обрабатываются только P2002 и 429. P2025 ( record not found) и P2014 (relation violation) падают в общую 500 ошибку.

---

#### Класс J: Frontend-Backend Sync (2 проблемы)

**J1. DELETE_BOOK не передаётся на сервер при атомарном сохранении**
- **Файл**: `src/hooks/useTierList.ts:262-296` и `src/utils/saveDiff.ts`
- **Суть**: `deleteTierIds` есть в стейте, `deletedBookIds` — нет. Удалённые книги не попадают в payload для `saveAll`.

**J2. `saveDiff.ts` не включает `userId` или контекст владельца**
- **Файл**: `src/utils/saveDiff.ts:50-119`
- **Суть**: Payload не содержит идентификатор пользователя или токен. Сервер должен получать userId из JWT в заголовке. Это нормально, но если saveAll вызывается из другого контекста — защита потеряна.

---

### 6.3 Рекомендуемые скиллы под классы проблем

| Класс | Скилл | Что будет содержать |
|-------|-------|-------------------|
| A | **bola-protection** | Паттерны проверки владения: assertOwner, resolveTierListId, проверка bookId/tierId в транзакциях, BOLA-тесты |
| B | **race-condition-prevention** | Атомарные операции (try-create-catch), мьютексы для ачивок, graceful Prisma error handling |
| C | **api-response-consistency** | `createSuccessResponse`, `createApiError` везде, тест на соответствие формату |
| D | **gamification-logic** | Валидация порогов, дедупликация названий, кэширование полученных ачивок, полнота sync-функций |
| E | **id-system-consistency** | Единая стратегия ID (UUID vs Int), `toNumericId` централизация, deletedBookIds паттерн |
| F | **rate-limiting-patterns** | Rate limit на все публичные эндпоинты, конфигурация через schema, тесты rate limit |
| G | **token-refresh-pattern** | Единый api-client для всех запросов, централизованная обработка 401 |
| H | **large-payload-handling** | Chunked upload, сжатие изображений до base64, проверка размера на клиенте |
| I | **prisma-error-handling** | Карта Prisma error codes, graceful degradation, понятные сообщения пользователю |
| J | **frontend-backend-consistency** | deletedBookIds, полный diff, тесты на консистентность типов |
