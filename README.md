# 📚 TierMaker Pro

Полнофункциональное веб-приложение для создания и управления ранжирующими списками (tier lists) книг с возможностью авторизации и сохранения данных.

![React](https://img.shields.io/badge/React-19.2-blue?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-7.2-blue?logo=vite) ![Fastify](https://img.shields.io/badge/Fastify-5.7-blue) ![Prisma](https://img.shields.io/badge/Prisma-4.16-green)

## 🎯 О проекте

**BookStrata Pro** — это приложение для создания и управления tier lists книг, позволяющее пользователям:

- 📝 Создавать персональные рейтинги и классификации книг
- 🖼️ Загружать обложки книг с помощью drag-and-drop
- 🎨 Организовывать книги по кастомным уровням (S, A, B, C, D и т.д.)
- 👤 Управлять учетной записью через систему авторизации
- 💾 Сохранять и загружать свои tier lists
- 📤 Экспортировать списки в изображение

## 🏗️ Архитектура

Проект построен на архитектуре **Full-Stack** с разделением на фронтенд и бэкенд:

```
tiermaker-pro/
├── src/                    # Фронтенд (React + TypeScript)
│   ├── app/               # Главный компонент приложения
│   ├── components/        # Переиспользуемые компоненты
│   ├── pages/            # Страницы приложения
│   ├── contexts/         # React Context для состояния
│   ├── hooks/            # Кастомные React hooks
│   ├── lib/              # Утилиты и API клиент
│   └── types/            # TypeScript типы
└── backend/               # Бэкенд (Fastify + Prisma)
    ├── src/
    │   ├── modules/      # Модули (auth, tier-lists)
    │   ├── plugins/      # Fastify плагины
    │   └── server.ts     # Точка входа сервера
    └── prisma/           # База данных (PostgreSQL)
```

## 🚀 Стек технологий

### Фронтенд

- **React 19** — UI библиотека
- **TypeScript** — типизация
- **Vite** — быстрый сборщик
- **TailwindCSS 4** — утилиты для стилизации
- **React Router** — навигация
- **@dnd-kit** — drag-and-drop функциональность
- **React Query** — управление состоянием сервера
- **react-hot-toast** — уведомления
- **Lucide React** — иконки

### Бэкенд

- **Fastify 5** — быстрый веб-фреймворк
- **Prisma** — ORM для работы с БД
- **PostgreSQL** — реляционная база данных
- **JWT** — аутентификация
- **bcryptjs** — хеширование паролей
- **CORS** — кросс-доменные запросы

## 📋 Требования

- **Node.js** 16+
- **npm** или **yarn**
- **PostgreSQL** 12+

## 🔧 Установка и запуск

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd tiermaker-pro
```

### 2. Установка зависимостей

```bash
# Установка зависимостей фронтенда
npm install

# Установка зависимостей бэкенда
cd backend
npm install
cd ..
```

### 3. Конфигурация переменных окружения

**Фронтенд:**
```bash
# Скопируйте пример
cp .env.example .env.local
```

Отредактируйте `.env.local` при необходимости:
```env
VITE_API_URL=http://localhost:8080
```

**Бэкенд:**
```bash
# Скопируйте пример
cp backend/.env.example backend/.env
```

Отредактируйте `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tiermaker_db"
CLIENT_URL=http://localhost:5173
PORT=8080
NODE_ENV="development"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
GOOGLE_BOOKS_API_KEY="your-google-books-api-key"
```

> ⚠️ **Важно:** Никогда не коммитьте файлы `.env` и `.env.local` в репозиторий! Они уже добавлены в `.gitignore`.

### 4. Миграции БД

```bash
# Перейти в папку backend
cd backend

# Выполнить миграции
npx prisma migrate dev

# (Опционально) Заполнить БД начальными данными
npx prisma db seed
```

### 5. Запуск приложения

**Терминал 1 — Фронтенд:**

```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:5173`

**Терминал 2 — Бэкенд:**

```bash
cd backend
npm run dev
```

API будет доступен по адресу: `http://localhost:8080`

## 📖 Основные функции

### Аутентификация

- Регистрация новых пользователей
- Вход по email и пароролю
- Защита маршрутов с JWT токенами
- Безопасное хеширование паролей (bcryptjs)

### Управление Tier Lists

- Создание новых рейтинговых списков
- Редактирование существующих списков
- Удаление списков
- Просмотр списков других пользователей

### Управление Книгами

- Добавление книг с обложками
- Drag-and-drop переемещение между уровнями
- Редактирование информации о книге (название, автор, описание)
- Загрузка обложек напрямую или через URL
- Сортировка и организация по уровням

### Экспорт и Визуализация

- Экспорт tier list в изображение (PNG)
- Визуальная сетка для отображения уровней
- Адаптивный дизайн для мобильных устройств

### Система шаблонов

- Создание и хранение шаблонов tier list
- Настройка структуры тиров (названия, цвета, порядок)
- Повторное использование шаблонов для быстрого создания новых списков
- Возможность сделать шаблоны публичными
- Библиотека шаблонов с возможностью поиска и фильтрации

## 🛠️ Разработка

### Запуск в режиме разработки

```bash
# Фронтенд с горячей перезагрузкой
npm run dev

# Бэкенд с автоматической перезагрузкой (backend/)
npm run dev
```

### Сборка для продакшена

```bash
# Сборка фронтенда
npm run build

# Предпросмотр production версии
npm run preview
```

### Проверка кода

```bash
# ESLint проверка
npm run lint
```

## 📁 Структура компонентов фронтенда

- **AuthForm** — форма входа/регистрации
- **TierGrid** — основная сетка tier list
- **TierRow** — строка с одним уровнем
- **SortableBookCover** — обложка книги с перетаскиванием
- **BookEditModal** — модальное окно редактирования книги
- **BookViewModal** — модальное окно просмотра книги
- **ImageUploader** — загрузчик изображений
- **SettingsSidebar** — боковая панель с настройками
- **UnrankedItems** — панель с неранжированными книгами

## 🔌 API эндпоинты

### Аутентификация

- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — вход
- `GET /api/auth/me` — информация о пользователе
- `POST /api/auth/logout` — выход

### Tier Lists

- `GET /api/tier-lists` — получить все списки пользователя
- `POST /api/tier-lists` — создать новый список
- `GET /api/tier-lists/:id` — получить список по ID
- `PUT /api/tier-lists/:id` — обновить список
- `DELETE /api/tier-lists/:id` — удалить список

## 🎨 Кастомизация

### Изменение цветовой схемы

Отредактируйте файл `src/constants/colors.ts` для изменения палитры цветов.

### Изменение уровней tier list

Отредактируйте компонент `src/components/TierGrid/TierGrid.tsx` для добавления/удаления уровней.

### Настройка темы

Используйте `src/contexts/ThemeProvider.tsx` для глобальной настройки темы приложения.

## 🐛 Известные проблемы и TODOs

Смотрите файл [IMPROVEMENT_RECOMMENDATIONS.md](./IMPROVEMENT_RECOMMENDATIONS.md) для списка улучшений.

## 📝 Логирование

Приложение включает логирование с разных сторон:

- **Фронтенд** — логирование ошибок и действий пользователя
- **Бэкенд** — детальное логирование с `pino` в режиме разработки

Просмотрите `src/lib/logger.ts` для деталей.

## 🤝 Контрибьюты

Если вы хотите улучшить проект, пожалуйста создавайте pull requests!

## 📄 Лицензия

ISC

## 👨‍💻 Автор

Ваше имя / Организация

---

**Дата последнего обновления**: 27 января 2026 г.
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
globalIgnores(['dist']),
{
files: ['**/*.{ts,tsx}'],
extends: [
// Other configs...
// Enable lint rules for React
reactX.configs['recommended-typescript'],
// Enable lint rules for React DOM
reactDom.configs.recommended,
],
languageOptions: {
parserOptions: {
project: ['./tsconfig.node.json', './tsconfig.app.json'],
tsconfigRootDir: import.meta.dirname,
},
// other options...
},
},
])

```

```
