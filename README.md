# BookStrata Pro 🎯

**BookStrata Pro** — профессиональное full-stack веб-приложение для создания, управления и визуализации книжных рейтингов (tier lists). Организовывайте свои книги по уровням (S, A, B, C, D), пишите рецензии и делитесь своими топами с сообществом.

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

**Последнее обновление:** 24 марта 2026 г.
**Статус:** Phase 2 Completed ✅ — Ready for Phase 3 (DevOps)
**Автор:** [@PlagiatXXX](https://github.com/PlagiatXXX)
**Аудит и рефакторинг:** Jules (Senior Fullstack AI)
