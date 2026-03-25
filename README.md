# BookStrata Pro 🎯

**BookStrata Pro** — профессиональное full-stack веб-приложение для создания, управления и визуализации книжных рейтингов (tier lists). Организовывайте свои книги по уровням (S, A, B, C, D), пишите рецензии и делитесь своими топами с сообществом.

[![Built with pollinations.ai](https://img.shields.io/badge/Built%20with-Pollinations-8a2be2?style=for-the-badge&logo=data:image/png;base64,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&logoColor=white&labelColor=6a0dad)](https://pollinations.ai)
[![React](https://img.shields.io/badge/React-19.2.0-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-5.7-000000?logo=fastify)](https://www.fastify.io)
[![Prisma](https://img.shields.io/badge/Prisma-4.16-2d3748?logo=prisma)](https://www.prisma.io)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38b2ac?logo=tailwindcss)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-145_written-blue)](./doctor.md)

---

## 📋 Содержание

- [✨ Возможности](#-возможности)
- [🛠️ Технологии](#️-технологии)
- [🚀 Быстрый старт](#-быстрый-старт)
- [🏗️ Архитектура](#️-архитектура)
- [🗄️ База данных](#️-база-данных)
- [🌐 API](#-api)
- [🧪 Тестирование](#-тестирование)
- [🔐 Безопасность](#-безопасность)
- [💎 Монетизация (Pro)](#-монетизация-pro)
- [🤝 Вклад](#-вклад)
- [📞 Контакты](#-контакты)

---

## ✨ Возможности

### 🎨 Редактор и UX
- **Drag-and-Drop** — Интуитивная сортировка книг через современную библиотеку `@dnd-kit`.
- **Автосохранение** — Оптимизированная система диффов для сохранения изменений в фоновом режиме.
- **Поиск книг** — Мгновенная интеграция с Google Books API для добавления обложек и описаний.
- **Загрузка файлов** — Возможность загружать свои изображения через Cloudinary.
- **Экспорт в PNG** — Делитесь своими результатами как готовыми изображениями.

### 📊 Dashboard и Сообщество
- **Умная фильтрация** — Сортировка по дате, популярности и алфавиту.
- **Публичные рейтинги** — Система лайков и возможность просмотра чужих списков.
- **Шаблоны** — Быстрый старт с предустановленными наборами (Fiction, Sci-Fi и др.).
- **Счётчик лимитов** — Прогресс-бар заполнения тир-листа (лимит 20 книг для бесплатных аккаунтов).

---

## 🛠️ Технологии

### Frontend
- **React 19.2** (с использованием новейших хуков и оптимизаций).
- **TypeScript 5.9** (strict mode, полная типизация бизнес-логики).
- **Vite 7.2** (молниеносная сборка и HMR).
- **TanStack Query 5** (управление серверным состоянием и кэшированием).
- **TailwindCSS 4** (современная стилизация с JIT).

### Backend
- **Fastify 5.7** (высокопроизводительный Node.js фреймворк).
- **Prisma ORM** (типобезопасная работа с PostgreSQL).
- **Zod** (валидация схем на уровне API).
- **JWT + bcryptjs** (безопасная аутентификация и хранение паролей).
- **Cloudinary** (обработка и хостинг изображений).

---

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- PostgreSQL 14+
- npm или yarn

### Установка и запуск

```bash
# 1. Клонирование репозитория
git clone https://github.com/PlagiatXXX/BookStrata.git
cd BookStrata

# 2. Установка зависимостей (frontend и backend)
npm install
cd backend && npm install && cd ..

# 3. Настройка переменных окружения
# Создайте .env в корне и в папке backend на основе .env.example
cp .env.example .env.local
cp backend/.env.example backend/.env

# 4. Инициализация базы данных
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..

# 5. Запуск разработки (два терминала)
npm run dev          # Frontend на http://localhost:5173
cd backend && npm run dev # Backend на http://localhost:8080
```

---

## 🏗️ Архитектура

Проект следует принципам **чистой архитектуры** и модульности:

- **Frontend:** Разделение на `pages/`, `components/`, `hooks/`, `contexts/`. Логика редактора вынесена в специализированные хуки (`useTierEditorState`, `useTierEditorSave` и др.).
- **Backend:** Модульный подход (`modules/`). Каждый модуль (auth, books, tier-lists) содержит свои роуты, схемы (Zod) и сервисы (Prisma).
- **API:** RESTful API с автоматической Swagger-документацией на `/documentation`.

---

## 🧪 Тестирование

Проект покрыт более чем 145 тестами (Vitest + React Testing Library).

```bash
# Запуск тестов фронтенда
npm test

# Запуск тестов бэкенда
cd backend && npm test
```
*Примечание: При использовании Vitest 4.0.18 ознакомьтесь с [doctor.md](./doctor.md) для корректной настройки пула.*

---

## 💎 Монетизация (Pro)

В приложении заложен фундамент для Pro-функционала:
- **Лимит книг:** Увеличение лимита с 20 до 100+ книг.
- **Приватность:** Скрытие профиля и возможность создания неограниченного числа приватных списков.
- **Экспорт:** Сохранение изображений в 4K качестве без водяных знаков.
- **Кастомные темы:** Доступ к эксклюзивным темам оформления (Dark Pro, Minimalist, Paper).

---

## 📄 Лицензия

MIT License — подробности в файле [LICENSE](./LICENSE).

---

## 🤝 Вклад

Мы приветствуем Pull Requests! Пожалуйста, следуйте стандартам ESLint и используйте Conventional Commits.

---

## 📞 Контакты

- **GitHub**: [@PlagiatXXX](https://github.com/PlagiatXXX)
- **Проект**: [BookStrata](https://github.com/PlagiatXXX/BookStrata)

---

**Последнее обновление:** 24 марта 2026 г.
**Статус:** Phase 2 Completed ✅ — Ready for Phase 3 (DevOps)
**Автор:** [@PlagiatXXX](https://github.com/PlagiatXXX)
**Аудит и рефакторинг:** Jules (Senior Fullstack AI)
