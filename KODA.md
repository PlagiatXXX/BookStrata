# KODA.md — Инструкции для AI-ассистента

**Версия:** 1.0  
**Дата:** 25 марта 2026  
**Проект:** BookStrata Pro  
**Автор:** AI-анализ

---

## 📋 Обзор проекта

**BookStrata Pro** — профессиональное full-stack веб-приложение для создания, управления и визуализации книжных рейтингов (tier lists). Пользователи могут организовывать книги по уровням (S, A, B, C, D), писать рецензии и делиться своими топами с сообществом.

### Технологический стек

| Уровень | Технологии |
|---------|------------|
| **Frontend** | React 19.2, TypeScript 5.9, Vite 7.2, TanStack Query 5, TailwindCSS 4, @dnd-kit, Framer Motion, Tiptap |
| **Backend** | Fastify 5.7, Prisma ORM, PostgreSQL, JWT, Zod, bcryptjs, Cloudinary |
| **Тестирование** | Vitest, React Testing Library, Happy DOM |
| **Инструменты** | ESLint, TypeScript strict mode, SWAGGER UI |

---

## 🏗️ Архитектура проекта

### Структура директорий

```
├── backend/              # Серверная часть (Fastify)
│   ├── src/
│   │   ├── lib/         # Утилиты и вспомогательные функции
│   │   ├── middleware/  # Промежуточное ПО (аутентификация, логирование)
│   │   ├── modules/     # Бизнес-логика по доменам
│   │   │   ├── auth/    # Аутентификация и авторизация
│   │   │   ├── users/   # Управление пользователями
│   │   │   ├── books/   # Книги и интеграция с Google Books API
│   │   │   ├── tier-lists/ # Управление tier-листами
│   │   │   ├── templates/ # Шаблоны списков
│   │   │   ├── avatars/ # Загрузка аватарок (Cloudinary)
│   │   │   ├── subscriptions/ # Pro-подписки
│   │   │   ├── roles/   # Роли пользователей
│   │   │   └── news/    # Новости
│   │   ├── plugins/     # Плагины Fastify
│   │   ├── types/       # TypeScript-типы для бэкенда
│   │   ├── server.ts    # Точка входа сервера
│   │   └── swagger.ts   # Конфигурация Swagger
│   ├── prisma/          # Схема БД и миграции
│   └── package.json
│
├── src/                 # Клиентская часть (React)
│   ├── app/
│   │   ├── App.tsx      # Корневой компонент
│   │   ├── main.tsx     # Точка входа
│   │   └── router.tsx   # Маршрутизация
│   ├── components/      # Переиспользуемые компоненты
│   ├── pages/           # Страницы приложения
│   │   ├── AuthPage/          # Страница входа/регистрации
│   │   ├── DashboardPage/     # Главная страница пользователя
│   │   ├── TierListEditorPage/# Редактор tier-листов (drag-and-drop)
│   │   ├── CommunityPage/     # Публичные списки сообщества
│   │   ├── ProfilePage/       # Профиль пользователя (index.tsx + components)
│   │   ├── CollectionPage/    # Коллекции книг
│   │   ├── NewsPage/          # Новости
│   │   ├── AdminDashboard/    # Админ-панель
│   │   ├── AdminCollectionsPage/
│   │   ├── AdminNewsPage/
│   │   └── AdminSubscriptionsPage/
│   ├── hooks/           # Кастомные React-хуки
│   ├── contexts/        # React-контексты (Auth, Theme)
│   ├── lib/             # Утилиты и API-клиенты
│   ├── types/           # TypeScript-типы для фронтенда
│   ├── utils/           # Вспомогательные функции
│   ├── constants/       # Централизованные лимиты и настройки
│   ├── ui/              # Базовые UI-компоненты
│   ├── layouts/         # Layout-компоненты
│   └── styles/          # Глобальные стили
│
├── docs/                # Документация
│   ├── AVATAR_FEATURE_SPEC.md
│   └── LOGGER.md
│
├── public/              # Статические файлы
├── scripts/             # Скрипты сборки/деплоя
├── shared/              # Общий код между frontend и backend
└── package.json         # Frontend-зависимости
```

### API Архитектура

- **RESTful API** с автоматической документацией на `/documentation`
- Валидация через **Zod** на уровне роутов
- Аутентификация через **JWT** в cookies
- Rate limiting через `@fastify/rate-limit`

---

## 🚀 Сборка и запуск

### Требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

### Установка

```bash
# Установка зависимостей frontend и backend
npm install
cd backend && npm install && cd ..
```

### Настройка окружения

```bash
# Копирование примеров конфигов
cp .env.example .env.local
cp backend/.env.example backend/.env
```

### Запуск в режиме разработки

```bash
# Terminal 1: Frontend (http://localhost:5173)
npm run dev

# Terminal 2: Backend (http://localhost:8080)
cd backend && npm run dev
```

### Команды для работы с БД

```bash
cd backend

# Создание миграций
npx prisma migrate dev

# Генерация Prisma Client
npx prisma generate

# Заполнение БД (seed)
npx prisma db seed
```

### Сборка и запуск продакшн

```bash
# Frontend
npm run build

# Backend
cd backend
npm run build
npm start
```

---

## 🧪 Тестирование

### Запуск тестов

```bash
# Frontend тесты
npm test

# Frontend тесты с UI
npm run test:ui

# Покрытие тестами
npm run test:coverage

# Backend тесты
cd backend && npm test

# Аудит React-кода
npm run doctor
```

**Статус:** 292/292 тестов проходят успешно ✅

---

## 📝 Правила разработки

### Стиль кодирования

- **TypeScript:** Strict mode включён, полная типизация обязательна
- **ESLint:** Проект использует `eslint-plugin-react-compiler` и `eslint-plugin-react-hooks`
- **React 19:** Используются современные хуки и оптимизации
- **Conventional Commits:** Формат коммитов `type(scope): message`

### Структура компонентов

- Компоненты располагаются в `src/components/`
- Страницы — в `src/pages/`
- Кастомные хуки — в `src/hooks/`
- Использование алиаса `@` для импортов (настроено в tsconfig)

### Работа с API

- API-клиент: Модульные клиенты в `src/lib/` (`authApi`, `tierListApi` и др.) (использует TanStack Query)
- Типы API: `src/types/api.ts`
- Все запросы проходят через `/api` прокси Vite на бэкенд

### TailwindCSS

- Конфигурация: `tailwind.config.ts`
- Кастомные цвета: primary, accent-blue, accent-green и др.
- Шрифт: Space Grotesk для заголовков
- Dark mode: поддерживается через класс `dark`

---

## 🔑 Ключевые файлы

| Файл | Назначение |
|------|------------|
| `backend/prisma/schema.prisma` | Схема базы данных |
| `backend/src/server.ts` | Точка входа сервера Fastify |
| `src/app/router.tsx` | Маршрутизация React-приложения |
| `src/pages/TierListEditorPage/` | Редактор tier-листов с drag-and-drop |
| `vite.config.ts` | Конфигурация Vite |
| `eslint.config.js` | Конфигурация ESLint |
| `docs/LOGGER.md` | Документация по логированию |
| `docs/AVATAR_FEATURE_SPEC.md` | Спецификация функционала аватарок |

---

## ⚙️ Важные настройки

### Проксирование API

В `vite.config.ts` настроен прокси с `/api` на `http://localhost:8080`:

```typescript
server: {
  proxy: {
    "/api": {
      target: "http://localhost:8080",
      changeOrigin: true,
    },
  },
}
```

### Алиасы импортов

В Vite и TypeScript настроен алиас `@` для директории `src`:

```json
"@": "path.resolve(__dirname, "src")"
```

### Цветовая схема (TailwindCSS)

Основные кастомные цвета:
- `primary`: #bf00e6 (фиолетовый)
- `background-light`: #f8f5f8
- `background-dark`: #200f23
- `surface-dark`: #2a162e
- Акцентные цвета: blue, green, orange, purple, pink, red

---

## 📌_notes

- Проект находится в Phase 2, готовится к Phase 3 (DevOps)
- Есть интеграция с Google Books API для поиска книг
- Cloudinary используется для загрузки изображений
- Swagger документация доступна по пути `/documentation` бэкенда
- Поддерживается Telegram Bot для уведомлений
