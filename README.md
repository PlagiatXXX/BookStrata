# BookStrata Pro 🎯

**BookStrata Pro** — полнофункциональное full-stack веб-приложение для создания и управления ранжирующими списками (tier lists) книг. Организовывайте книги по уровням (S, A, B, C, D), загружайте обложки через drag-and-drop, делитесь своими рейтингами.

[![Built with pollinations.ai](https://img.shields.io/badge/Built%20with-Pollinations-8a2be2?style=for-the-badge&logo=data:image/png;base64,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&logoColor=white&labelColor=6a0dad)](https://pollinations.ai)
[![React](https://img.shields.io/badge/React-19.2.0-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-5.7-000000?logo=fastify)](https://www.fastify.io)
[![Tests](https://img.shields.io/badge/Tests-292_passed-brightgreen)](./QWEN.md)

---

## 📋 Содержание

- [Возможности](#-возможности)
- [Технологии](#-технологии)
- [Быстрый старт](#-быстрый-старт)
- [Архитектура](#-архитектура)
- [Структура проекта](#-структура-проекта)
- [База данных](#-база-данных)
- [API](#-api)
- [Тестирование](#-тестирование)
- [Разработка](#-разработка)

---

## ✨ Возможности

### Основные функции
- 🎨 **Drag-and-Drop редактор** — Интуитивная сортировка книг между уровнями
- 📚 **Поиск книг** — Интеграция с Google Books API
- 🖼️ **Загрузка обложек** — Локально, по URL или через Cloudinary
- 📤 **Экспорт в PNG** — Делитесь рейтингами как изображениями
- 🎭 **Система шаблонов** — Быстрое создание списков из готовых шаблонов
- 👍 **Система лайков** — Лайкайте и находите публичные рейтинги
- 🌓 **Тёмная/Светлая тема** — Переключение тем оформления

### Dashboard (Март 2026)
- 🔀 **Умная сортировка** — 4 варианта: новые, старые, по названию, по популярности
- 🏷️ **Фильтрация** — Все / Публичные / Приватные
- 🔍 **Поиск** — Комбинированный поиск + фильтры + сортировка
- 📊 **Счётчик книг** — Визуальный прогресс заполнения (макс. 20 книг)
- 🎯 **Статусы** — «В процессе» / «Завершён» с цветовой индикацией

### Лимит книг (Март 2026)
- 📊 **Прогресс-бар** — Визуальное отображение заполнения (0-20 книг)
- ⚠️ **Предупреждения** — Уведомления при приближении к лимиту
- 🔒 **Блокировка** — Автоматическая блокировка при достижении 20 книг
- 💎 **Pro-подписка** — Архитектурная готовность для снятия ограничений

### Мониторинг ошибок (Март 2026)
- 📡 **Telegram уведомления** — Мгновенные оповещения разработчику
- 📝 **Логирование** — JSON логи в production
- ⏱️ **Throttling** — Макс. 1 уведомление в 5 секунд

---

## 🛠️ Технологии

### Frontend
| Технология | Версия | Назначение |
|------------|--------|------------|
| React | 19.2.0 | UI библиотека |
| TypeScript | 5.9 | Типизация |
| Vite | 7.2 | Сборка |
| TailwindCSS | 4.1.18 | Стилизация |
| React Router | 7.12.0 | Роутинг |
| TanStack Query | 5.90.20 | Серверное состояние |
| @dnd-kit | 6.3+ | Drag-and-drop |
| React Dropzone | 14.3.8 | Загрузка файлов |
| html-to-image | 1.11.13 | Экспорт изображений |
| Lucide React | 0.562.0 | Иконки |

### Backend
| Технология | Версия | Назначение |
|------------|--------|------------|
| Fastify | 5.7 | Веб-фреймворк |
| Prisma | 4.16.2 | ORM |
| PostgreSQL | 12+ | База данных |
| JWT | 9.0.3 | Аутентификация |
| bcryptjs | 3.0.3 | Хеширование паролей |
| Zod | 4.3.6 | Валидация |
| Cloudinary | 2.9.0 | Хостинг изображений |
| @fastify/* | various | Плагины (cors, rate-limit, swagger) |

---

## 🚀 Быстрый старт

### Требования
- Node.js 16+
- PostgreSQL 12+
- npm или yarn

### Установка

```bash
# 1. Клонирование репозитория
git clone https://github.com/PlagiatXXX/BookStrata.git
cd tiermaker-pro

# 2. Установка зависимостей frontend
npm install

# 3. Установка зависимостей backend
cd backend
npm install
cd ..

# 4. Настройка переменных окружения
cp .env.example .env.local
cp backend/.env.example backend/.env
```

### Конфигурация

**Frontend (`.env.local`):**
```env
VITE_API_URL=http://localhost:8080
```

**Backend (`backend/.env`):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tiermaker_db"
CLIENT_URL=http://localhost:5173
PORT=8080
NODE_ENV="development"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
GOOGLE_BOOKS_API_KEY="your-google-books-api-key"
```

### База данных

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### Запуск

**Терминал 1 — Frontend:**
```bash
npm run dev
# Доступно: http://localhost:5173
```

**Терминал 2 — Backend:**
```bash
cd backend
npm run dev
# API доступно: http://localhost:8080
```

---

## 🏗️ Архитектура

```
tiermaker-pro/
├── src/                          # Frontend (React 19 + TypeScript)
│   ├── app/                      # Оболочка приложения, роутинг
│   ├── components/               # Переиспользуемые UI компоненты
│   │   ├── Avatar/               # Компоненты аватара
│   │   ├── BookCounter/          # Счётчик книг (лимит 20)
│   │   ├── HeroSection/          # Hero секция (3D книга)
│   │   ├── NewHeroSection/       # Новая Hero секция (Dashboard)
│   │   ├── TemplateLibrary/      # Библиотека шаблонов
│   │   ├── TierGrid/             # Сетка тир-листов
│   │   └── UnrankedItems/        # Панель нерейтингованных книг
│   ├── contexts/                 # React Context (Auth, Theme)
│   ├── hooks/                    # Кастомные React хуки
│   ├── layouts/                  # Layout компоненты
│   ├── lib/                      # Утилиты, API клиент, логгер
│   ├── pages/                    # Страницы приложения
│   │   ├── DashboardPage/        # Главная страница
│   │   ├── TierListEditorPage/   # Редактор тир-листов
│   │   ├── ProfilePage/          # Профиль пользователя
│   │   └── AuthPage/             # Авторизация
│   ├── types/                    # TypeScript типы
│   └── utils/                    # Вспомогательные функции
├── backend/                      # Backend (Fastify + Prisma)
│   ├── src/
│   │   ├── modules/              # Модули (auth, tier-lists, templates)
│   │   ├── plugins/              # Fastify плагины
│   │   └── server.ts             # Точка входа сервера
│   └── prisma/
│       ├── schema.prisma         # Схема БД
│       ├── migrations/           # Миграции БД
│       └── seed.ts               # Seed данные
└── docs/                         # Документация
```

---

## 📁 Структура проекта

### Ключевые компоненты

#### DashboardPage
- **Hero секция** — Приветствие с превью рейтинга
- **Статистика** — Создано/Опубликовано/Черновики
- **Шаблоны быстрого старта** — Fiction, Sci-Fi, Detectives, Non-fiction
- **Фильтры и сортировка** — Все/Публичные/Приватные + 4 варианта сортировки
- **Карточки тир-листов** — С прогрессом заполнения и статусами

#### TierListEditorPage
- **EditorLayout** — Контейнер для drag-and-drop
- **EditorHeader** — Заголовок + индикатор автосохранения
- **EditorMainContent** — Сетка тиров + нерейтингованные книги
- **EditorModals** — Модальные диалоги
- **BookCounter** — Счётчик книг с прогресс-баром

### Хуки

#### DashboardPage hooks
- `useDashboardState` — Управление состоянием (useReducer)
- `useTierListActions` — CRUD операции
- `useTierListsPagination` — Фильтрация + сортировка + пагинация

#### TierListEditorPage hooks
- `useTierEditorState` — 14 useState состояний
- `useTierEditorQueries` — 3 useQuery запроса
- `useTierEditorDrag` — Логика drag-and-drop
- `useTierEditorBlocker` — Блокировка навигации
- `useTierEditorSave` — Оптимизированное автосохранение
- `useTierListBooksLimit` — Отслеживание лимита книг

---

## 🗄️ База данных

### Основные модели

**User**
- `id`, `email`, `username`, `avatarUrl`, `passwordHash`
- `aiAvatarsGenerated`, `lastAvatarResetAt`
- Связи: `tierLists`, `templates`, `tierListLikes`, `templateLikes`

**TierList**
- `id`, `userId`, `title`, `year`, `isTemplate`, `isPublic`
- Связи: `user`, `tiers`, `placements`, `likes`

**Tier**
- `id`, `tierListId`, `title`, `color`, `rank`
- Индекс: `[tierListId, rank]`

**Book**
- `id`, `title`, `author`, `coverImageUrl`, `description`, `thoughts`
- Связи: `placements`

**BookPlacement**
- Составной ID: `[tierListId, bookId]`
- `tierId`, `rank`
- Индекс: `[tierId, rank]`

**Template**
- `id` (UUID), `title`, `description`, `tiers` (JSON), `defaultBooks` (JSON)
- `authorId`, `isPublic`
- Связи: `author`, `likes`

**TierListLike / TemplateLike**
- Уникальное ограничение: `[userId, tierListId/templateId]`

---

## 🌐 API

### Аутентификация
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| GET | `/api/auth/me` | Текущий пользователь |
| POST | `/api/auth/logout` | Выход |

### Тир-листы
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/tier-lists` | Список тир-листов пользователя |
| POST | `/api/tier-lists` | Создание тир-листа |
| GET | `/api/tier-lists/:id` | Получить тир-лист по ID |
| PUT | `/api/tier-lists/:id` | Обновить тир-лист |
| DELETE | `/api/tier-lists/:id` | Удалить тир-лист |
| POST | `/api/tier-lists/:id/books` | Добавить книги |
| PUT | `/api/tier-lists/:id/placements` | Сохранить позиции |

### Шаблоны
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/templates` | Все шаблоны |
| POST | `/api/templates` | Создать шаблон |
| GET | `/api/templates/:id` | Шаблон по ID |
| PUT | `/api/templates/:id` | Обновить шаблон |
| DELETE | `/api/templates/:id` | Удалить шаблон |

---

## 🧪 Тестирование

### Frontend (Vitest + React Testing Library)
```bash
npm run test          # Запуск тестов
npm run test:ui       # Тесты с UI
npm run test:coverage # Отчёт о покрытии
```

### Backend (Vitest)
```bash
cd backend
npm run test
npm run test:ui
```

### Покрытие тестами (Март 2026)
| Расположение | Тесты | Статус |
|--------------|-------|--------|
| `src/hooks/` | 30 | ✅ |
| `src/pages/TierListEditorPage/hooks/` | 68 | ✅ |
| `src/pages/DashboardPage/hooks/` | 22 | ✅ |
| `src/components/TemplateLibrary/hooks/` | 28 | ✅ |
| `src/components/Avatar/hooks/` | 12 | ✅ |
| `src/components/BookCounter/` | 11 | ✅ |
| `src/lib/` | 3 | ✅ |
| `src/utils/` | 17 | ✅ |
| `src/ui/` | 7 | ✅ |
| **Всего** | **292** | ✅ |

```
Test Files: 23 passed (23)
Tests: 292 passed (292)
Duration: ~50s
```

---

## 📝 Разработка

### Соглашения

#### Стиль кода
- **TypeScript** — strict mode
- **ESLint** — настроен в `eslint.config.js`

#### Git Workflow
- Ветки: `feature/<name>`, `fix/<name>`
- Commits: Conventional Commits

#### Именование файлов
- Компоненты: `PascalCase.tsx`
- Утилиты: `camelCase.ts`
- Константы: `constants/<name>.ts`
- Типы: `types/<name>.ts`

#### Импорт
```typescript
import { Component } from '@/components/Component'
import { hook } from '@/hooks/hook'
import { utils } from '@/utils/utils'
```

---

## 🔐 Безопасность

- **JWT Secret** — менять в production
- **Environment files** — `.env` и `.env.local` в `.gitignore`
- **Пароли** — bcryptjs с солью
- **CORS** — настроен для конкретного URL клиента
- **Rate limiting** — через `@fastify/rate-limit`

---

## 🚀 Развёртывание

### Pre-launch чеклист
- [ ] Все переменные окружения настроены
- [ ] Логирование ошибок включено
- [ ] Rate limiting активирован
- [ ] HTTPS включён
- [ ] CORS правильно настроен
- [ ] Бэкапы БД работают
- [ ] Мониторинг настроен

### Production сборка
```bash
# Frontend
npm run build
npm run preview

# Backend
cd backend
npm run build
npm run start
```

---

## 📞 Справочник

| Сервис | URL | Назначение |
|--------|-----|------------|
| Frontend | `http://localhost:5173` | React приложение |
| Backend API | `http://localhost:8080` | Fastify API |
| Swagger UI | `http://localhost:8080/docs` | Документация API |
| PostgreSQL | `localhost:5432` | База данных |

---

## 📄 Лицензия

MIT License — подробности в файле [LICENSE](./LICENSE).

---

## 🤝 Вклад

1. Fork репозитория
2. Создание ветки (`git checkout -b feature/AmazingFeature`)
3. Коммит изменений (`git commit -m 'Add AmazingFeature'`)
4. Push в ветку (`git push origin feature/AmazingFeature`)
5. Pull Request

---

## 📞 Контакты

- **GitHub**: [@PlagiatXXX](https://github.com/PlagiatXXX)
- **Проект**: [BookStrata](https://github.com/PlagiatXXX/BookStrata)

---

**Последнее обновление**: 13 марта 2026 г.  
**Статус проекта**: Phase 2 Completed ✅ — Ready for Phase 3  
**Тесты**: 292 passed ✅  
**Сборка**: Production ready ✅
