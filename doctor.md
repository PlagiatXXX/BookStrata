# 🔍 TierMaker Pro — Comprehensive Project Audit

**Дата аудита**: 10 марта 2026 г.  
**Аудитор**: Senior Fullstack Developer (10 лет опыта)  
**Статус проекта**: Phase 2 Completed ✅ — Dashboard Enhanced (Сортировка, Фильтры, Telegram Notifications)

---

## 📊 Общая оценка проекта

| Категория | Оценка | Статус |
|-----------|--------|--------|
| **Архитектура** | 88/100 | ✅ Отлично |
| **Безопасность** | 75/100 | ⚠️ Требует работы |
| **Производительность** | 72/100 | ⚠️ Требует работы |
| **Тестирование** | 60/100 | ⚠️ Требует работы |
| **Code Quality** | 85/100 | ✅ Хорошо |
| **DevOps** | 55/100 | ⚠️ Требует работы |
| **Документация** | 88/100 | ✅ Хорошо |

**Общий score: 75/100** — Проект с отличной основой, улучшен Dashboard и мониторинг

---

## ✅ Сильные стороны проекта

### 1. Архитектура и структура кода

#### Frontend (React 19 + TypeScript)
- ✅ **Правильная модульная структура**: чёткое разделение на `components/`, `hooks/`, `pages/`, `contexts/`
- ✅ **Custom hooks**: отличная декомпозиция логики (25+ хуков)
- ✅ **TypeScript strict mode**: полная типизация, `noUncheckedIndexedAccess`
- ✅ **Рефакторинг крупных компонентов**: 
  - `TierListEditorPage`: 533 → 332 строк (-38%)
  - `TemplateLibrary`: 714 → 280 строк (-61%)
  - `DashboardPage`: 566 → 200 строк (-65%)
- ✅ **React Router v7**: современная маршрутизация
- ✅ **TanStack Query**: правильное управление server state
- ✅ **@dnd-kit**: современная библиотека для drag-and-drop

#### Backend (Fastify + Prisma)
- ✅ **Модульная архитектура**: разделение на `modules/` (auth, avatars, tier-lists, etc.)
- ✅ **Fastify plugins**: правильное использование экосистемы Fastify
- ✅ **Prisma ORM**: типобезопасная работа с БД
- ✅ **Zod validation**: валидация входных данных
- ✅ **Logger utility**: контекстный логгер с уровнями

### 2. Тестирование

- ✅ **250+ тестов** покрывают ключевую логику
- ✅ **Тесты хуков**: все кастомные хуки покрыты тестами
- ✅ **Vitest + React Testing Library**: современный стек
- ✅ **Test coverage отчёты**: HTML/JSON отчёты
- ✅ **Тесты для reducer'ов**: `templateLibraryReducer.spec.ts`

```
Test Files: 20+ passed
Tests: 250+ passed
Coverage: ~60% (frontend hooks)
```

### 3. Безопасность (базовый уровень)

- ✅ **JWT аутентификация**: правильная реализация
- ✅ **bcryptjs**: хеширование паролей
- ✅ **CORS**: настроен для конкретного client URL
- ✅ **Rate limiting**: 100 запросов в минуту
- ✅ **Environment variables**: разделение конфигов
- ✅ **Input validation**: Zod схемы

### 4. Документация

- ✅ **ROADMAP.md**: детальный план из 5 фаз
- ✅ **QWEN.md**: comprehensive context guide
- ✅ **README.md**: инструкция по запуску
- ✅ **API Documentation**: Swagger UI на `/documentation`
- ✅ **Business Plan**: стратегия монетизации

---

## ❌ Критические проблемы

### 1. DevOps — 55/100 (ТРЕБУЕТ РАБОТЫ)

#### Проблема 1.1: Отсутствует CI/CD pipeline
```
❌ Нет GitHub Actions workflow
❌ Нет автоматических тестов в CI
❌ Нет автоматического деплоя на VPS
❌ Нет preview деплоев для PR
```

**Риск**: Ручной деплой, человеческие ошибки, нет автоматического тестирования

**Решение**:
```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Deploy via SSH
        uses: easingthemes/ssh-deploy@v4
        with:
          SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_KEY }}
          REMOTE_HOST: ${{ secrets.VPS_HOST }}
          REMOTE_USER: root
          SOURCE: dist/
          TARGET: /var/www/tiermaker-pro
```

#### Проблема 1.2: Нет мониторинга и логирования в production

**Статус**: ✅ ЧАСТИЧНО РЕШЕНО (Telegram + логирование в файл)

```
✅ Telegram уведомления об ошибках (готово)
✅ Логирование в файл (JSON format) (готово)
⏸️ Health checks endpoint (отложено до VPS)
⏸️ Uptime monitoring (отложено до VPS)
```

**Риск**: Невозможно отследить ошибки в production, нет alerting

**Решение**:
- ✅ Интегрировать Telegram уведомления (готово)
- ✅ Добавить логирование в файл (готово)
- ⏸️ Создать `/health` endpoint (когда будет VPS)
- ⏸️ Настроить uptime monitoring (когда будет VPS)

#### Проблема 1.3: Нет backup стратегии
```
❌ Нет автоматических бэкапов БД
❌ Нет миграций в production
❌ Нет отката миграций
```

**Риск**: Потеря данных при сбоях

**Решение**:
```bash
# /etc/cron.daily/pg-backup
#!/bin/bash
pg_dump -U tiermaker tiermaker_db | gzip > /backups/db-$(date +\%F).sql.gz
# Хранить 7 последних бэкапов
find /backups -name "*.sql.gz" -mtime +7 -delete
```

#### Проблема 1.4: Нет production deployment guide
```
❌ Нет инструкций по деплою на VPS
❌ Нет nginx конфигурации
❌ Нет SSL/TLS настройки
❌ Нет PM2/systemd конфигурации
```

**Риск**: Сложности с развёртыванием, простой

**Решение**: Добавить секцию в README с полной инструкцией

---

### 2. Безопасность — 75/100 (ТРЕБУЕТ РАБОТЫ)

#### Проблема 2.1: JWT секрет в .env
```typescript
// backend/.env
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

**Риск**: В README/QWEN.md указано значение по умолчанию — разработчики могут забыть изменить

**Решение**:
- ✅ Валидация при старте (есть в `server.ts`)
- ⚠️ Добавить генерацию secure random secret при первом запуске
- ⚠️ Добавить warning если используется default значение

#### Проблема 2.2: Нет HTTPS в production
```
❌ Нет конфигурации для HTTPS
❌ Нет HSTS заголовков
❌ Нет security headers
```

**Риск**: MITM атаки, перехват данных

**Решение**:
```typescript
// Добавить security headers
fastify.register(import('fastify-helmet'));
fastify.register(import('fastify-floc-off'));
```

#### Проблема 2.3: Нет input sanitization
```typescript
// Пример уязвимости
logger.error(error, context); // context может содержать XSS
```

**Риск**: XSS атаки через логирование

**Решение**:
- Санитизировать весь пользовательский ввод
- Использовать DOMPurify для текста

#### Проблема 2.4: Слабый rate limiting
```typescript
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});
```

**Риск**: 100 запросов/минуту недостаточно для защиты от brute force

**Решение**:
```typescript
// Дифференцированный rate limiting
rateLimit: {
  max: 5,      // auth endpoints
  timeWindow: '1 minute'
}
rateLimit: {
  max: 1000,   // public read endpoints  
  timeWindow: '1 minute'
}
```

---

### 3. Производительность — 70/100 (ТРЕБУЕТ РАБОТЫ)

#### Проблема 3.1: Нет bundle analysis
```
❌ Нет @vitejs/plugin-bundle-size
❌ Нет анализа зависимостей
❌ Возможно есть dead code
```

**Решение**:
```bash
npm install -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';
plugins: [visualizer({ open: true })]
```

#### Проблема 3.2: Нет lazy loading для роутов
```typescript
// src/app/app.tsx
import { Outlet } from "react-router-dom";
// Все компоненты загружаются сразу
```

**Решение**:
```typescript
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const TierListEditorPage = lazy(() => import('@/pages/TierListEditorPage'));
```

#### Проблема 3.3: Нет индексов в БД для частых запросов
```prisma
// schema.prisma
model Book {
  id          String   @id @default(cuid())
  title       String
  author      String
  // ❌ Нет индекса для поиска по title/author
}
```

**Решение**:
```prisma
model Book {
  id          String   @id @default(cuid())
  title       String   @db.VarChar(255)
  author      String   @db.VarChar(255)
  
  @@index([title])
  @@index([author])
  @@index([title, author])
}
```

#### Проблема 3.4: Нет кэширования запросов
```typescript
// Каждый запрос идёт в БД
const tierLists = await prisma.tierList.findMany();
```

**Решение**:
- Использовать React Query caching (частично настроено)
- Добавить Redis для server-side caching
- Настроить stale-while-revalidate стратегию

#### Проблема 3.5: Нет оптимизации изображений
```typescript
// Загрузка обложек без оптимизации
<ImageUploader onUpload={handleUpload} />
```

**Риск**: Большие файлы, медленная загрузка

**Решение**:
- Сжимать изображения на клиенте перед загрузкой
- Использовать Cloudinary transformations
- Добавить lazy loading для изображений

---

### 4. Тестирование — 60/100 (ТРЕБУЕТ РАБОТЫ)

#### Проблема 4.1: Нет тестов для backend
```
backend/src/
├── modules/
│   ├── auth/
│   │   ├── auth.route.ts    ❌ Нет тестов
│   │   └── auth.service.ts  ❌ Нет тестов
│   ├── tier-lists/
│   │   ├── tierList.route.ts    ❌ Нет тестов
│   │   └── tierList.service.ts  ❌ Нет тестов
```

**Риск**: Регрессии в API логике, поломанные endpoints

**Решение**:
```bash
# Создать тесты:
backend/src/modules/auth/auth.service.test.ts
backend/src/modules/auth/auth.route.test.ts
backend/src/modules/tier-lists/tierList.service.test.ts
```

#### Проблема 4.2: Нет E2E тестов
```
❌ Нет Playwright/Cypress
❌ Нет тестов критических путей
❌ Нет визуального регрессионного тестирования
```

**Решение**:
```bash
npm install -D @playwright/test
# Создать:
- tests/e2e/auth.spec.ts
- tests/e2e/tier-list-crud.spec.ts
- tests/e2e/drag-and-drop.spec.ts
```

#### Проблема 4.3: Нет тестов для компонентов
```
src/components/
├── TierGrid/       ❌ Нет тестов
├── TierRow/        ❌ Нет тестов
├── BookEditModal/  ❌ Нет тестов
```

**Решение**:
```typescript
// src/components/TierGrid/TierGrid.test.tsx
describe('TierGrid', () => {
  it('должен рендерить тиры в правильном порядке', () => {});
  it('должен вызывать onDragEnd при перетаскивании', () => {});
});
```

#### Проблема 4.4: Нет snapshot тестов
```
❌ Нет snapshot тестов для UI компонентов
❌ Нет тестов на accessibility
```

---

### 5. Code Quality — 80/100 (ХОРОШО, НО ЕСТЬ ПРОБЛЕМЫ)

#### Проблема 5.1: eslint только для frontend
```
❌ Нет eslint для backend
❌ Нет prettier конфигурации
❌ Нет husky pre-commit hooks
```

**Решение**:
```bash
# Backend
cd backend
npm install -D eslint @typescript-eslint/parser

# Root
npm install -D prettier husky lint-staged
```

#### Проблема 5.2: Нет code ownership
```
❌ Нет CODEOWNERS файла
❌ Нет PR шаблонов
❌ Нет commit message conventions
```

#### Проблема 5.3: Console.log в коде
```typescript
// backend/src/server.ts (строка 35)
console.error(`FATAL: ${envVar} is not defined`);
```

**Решение**: Заменить на `fastify.log.error()`

---

### 6. Архитектура — 85/100 (ХОРОШО)

#### Проблема 6.1: Монолитная архитектура
```
❌ Весь backend в одном процессе
❌ Нет разделения на API gateway + services
```

**Риск**: Сложно масштабировать, single point of failure

**Решение** (на будущее):
- Выделить auth в отдельный сервис
- Выделить image processing в отдельный worker

#### Проблема 6.2: Нет event-driven архитектуры
```
❌ Все операции синхронные
❌ Нет очереди задач
```

**Решение**:
```typescript
// Использовать Bull для очередей
const imageQueue = new Queue('image-processing');
await imageQueue.add('process', { bookId, imageUrl });
```

---

## 📋 План улучшений (Priority Matrix)

### 🔴 HIGH IMPACT, LOW EFFORT (Сделать в первую очередь)

| Задача | Время | Приоритет |
|--------|-------|-----------|
| 1. GitHub Actions CI/CD | 4 часа | 🔴 Критично |
| 2. Health check endpoint | 30 мин | 🔴 Критично |
| 3. Sentry integration | 2 часа | 🔴 Критично |
| 4. Security headers | 1 час | 🟠 Высокий |
| 5. Rate limiting для auth | 30 мин | 🟠 Высокий |
| 6. Backend тесты (services) | 8 часов | 🟠 Высокий |
| 7. VPS deployment guide | 2 часа | 🟠 Высокий |
| 8. Database indexes | 2 часа | 🟠 Высокий |

### 🟠 HIGH IMPACT, HIGH EFFORT (Планировать внимательно)

| Задача | Время | Приоритет |
|--------|-------|-----------|
| 1. E2E тесты (Playwright) | 16 часов | 🟠 Высокий |
| 2. Lazy loading роутов | 4 часа | 🟡 Средний |
| 3. Bundle optimization | 4 часа | 🟡 Средний |
| 4. Оптимизация изображений | 6 часов | 🟡 Средний |
| 5. Redis кэширование | 8 часов | 🟡 Средний |
| 6. Nginx настройка | 2 часа | 🟠 Высокий |

### 🟡 LOW IMPACT, LOW EFFORT (Nice to have)

| Задача | Время | Приоритет |
|--------|-------|-----------|
| 1. Prettier config | 1 час | 🟢 Низкий |
| 2. Husky pre-commit hooks | 2 часа | 🟢 Низкий |
| 3. CODEOWNERS файл | 15 мин | 🟢 Низкий |
| 4. PR шаблоны | 1 час | 🟢 Низкий |
| 5. Commit lint | 1 час | 🟢 Низкий |
| 6. Uptime monitoring | 30 мин | 🟠 Высокий |

### ⚫ LOW IMPACT, HIGH EFFORT (Избегать)

| Задача | Почему избегать |
|--------|----------------|
| Микросервисы | Преждевременная оптимизация, < 10k пользователей |
| Полный редизайн | Текущий UI функционален |
| Поддержка 50 языков | Нет спроса, сложность i18n |
| Kubernetes | Избыточно для VPS деплоя |

---

## 🎯 Roadmap улучшений (3 недели)

### НЕДЕЛЯ 1: CI/CD & Monitoring

```
День 1-2: GitHub Actions CI/CD
├─ .github/workflows/test.yml (тесты на каждый push)
├─ .github/workflows/deploy.yml (деплой на VPS)
├─ SSH secrets настройка
└─ Deploy script (rsync/SCP)

День 3: Health Check + Monitoring
├─ GET /health endpoint (backend)
├─ DB connection check
├─ Sentry integration (@sentry/node)
└─ UptimeRobot настройка

День 4: Security Hardening
├─ Security headers (helmet)
├─ Rate limiting (differential)
├─ Input sanitization
└─ CORS review

День 5: VPS Preparation
├─ Server setup guide
├─ nginx config template
├─ SSL (Let's Encrypt)
└─ PM2/systemd config
```

**Результат**: CI/CD работает, ошибки логируются, security hardened, VPS готов

---

### НЕДЕЛЯ 2: Backend Testing & Database

```
День 1-3: Backend Tests
├─ auth.service.test.ts
├─ auth.route.test.ts
├─ tierList.service.test.ts
├─ templates.service.test.ts
└─ books.service.test.ts

День 4: Database Optimization
├─ Add indexes (title, author, email)
├─ Prisma migration
└─ Query review

День 5: Performance
├─ N+1 queries fix
├─ Include/select optimization
├─ Query logging
└─ Slow query analysis
```

**Результат**: 70%+ backend coverage, БД оптимизирована

---

### НЕДЕЛЯ 3: Performance & E2E

```
День 1-2: Frontend Performance
├─ rollup-plugin-visualizer
├─ Bundle analysis
├─ Code splitting
└─ Lazy loading роутов

День 3-4: E2E Tests (Playwright)
├─ Playwright setup
├─ Auth flow test
├─ Tier list CRUD test
└─ Drag-and-drop test

День 5: Documentation
├─ VPS Deployment Guide (README)
├─ API documentation update
├─ Environment variables guide
└─ Troubleshooting section
```

**Результат**: Production-ready application на VPS

---

## 📈 Метрики успеха

### После Недели 1 (CI/CD & Monitoring)
- [ ] CI pipeline проходит < 10 минут
- [ ] Деплой на VPS автоматизирован
- [ ] Health check возвращает 200 OK
- [ ] Sentry ловит ошибки
- [ ] Uptime monitoring настроен

### После Недели 2 (Testing & Database)
- [ ] Backend test coverage > 70%
- [ ] Security headers в ответах
- [ ] Rate limiting работает
- [ ] Все индексы добавлены
- [ ] Query time < 50ms

### После Недели 3 (Performance & E2E)
- [ ] 10+ E2E тестов
- [ ] Критические пути покрыты
- [ ] Lighthouse Performance > 90
- [ ] Bundle size < 500KB (gzipped)
- [ ] Документация актуальна

---

## 🚨 Риски и mitigation

| Риск | Вероятность | Влияние | Mitigation |
|------|-------------|---------|------------|
| Breaking changes в Docker | Низкая | Высокое | Использовать pinned versions |
| CI/CD сложен для команды | Средняя | Среднее | Документировать, training |
| Sentry дорого стоит | Низкая | Среднее | Использовать free tier (5k errors) |
| Тесты замедляют разработку | Средняя | Низкое | Писать только критичные тесты |
| Redis сложность | Средняя | Среднее | Начать с in-memory, потом Redis |

---

## 💡 Рекомендации по архитектуре

### Текущая архитектура (Монолит)
```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│   Frontend  │────▶│   Backend    │────▶│ PostgreSQL│
│  (React 19)  │     │  (Fastify)   │     │          │
└─────────────┘     └──────────────┘     └──────────┘
```

### Целевая архитектура (Phase 5)
```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│   Frontend  │────▶│  API Gateway │────▶│   Redis   │
│  (React 19)  │     │   (Fastify)  │     │  (Cache)  │
└─────────────┘     └──────┬───────┘     └──────────┘
                           │
                    ┌──────┴───────┐
                    │              │
             ┌──────▼──────┐ ┌────▼────────┐
             │ Auth Service│ │Tier Service │
             │   (JWT)     │ │  (CRUD)     │
             └──────┬──────┘ └────┬────────┘
                    │              │
                    └──────┬───────┘
                           │
                      ┌────▼────┐
                      │PostgreSQL│
                      └──────────┘
```

---

## 📚 Ресурсы для команды

### Обучение
1. **GitHub Actions**: https://docs.github.com/en/actions
2. **Testing**: https://testing-library.com/docs/
3. **Sentry**: https://docs.sentry.io/
4. **VPS Deployment**: https://www.digitalocean.com/community/tutorials

### Инструменты
1. **Bundle analysis**: `npm install -D rollup-plugin-visualizer`
2. **Performance**: Chrome DevTools Lighthouse
3. **Security**: `npm audit`, `snyk test`
4. **Uptime Monitoring**: https://uptimerobot.com/ (free, 50 checks)

---

## 🖥️ VPS Deployment Guide

### Требования к серверу

**Минимальные:**
- CPU: 1 core
- RAM: 1 GB
- Storage: 10 GB
- OS: Ubuntu 22.04 LTS

**Рекомендуемые:**
- CPU: 2 cores
- RAM: 2 GB
- Storage: 25 GB SSD
- OS: Ubuntu 22.04 LTS

---

### Шаг 1: Подготовка сервера

```bash
# Подключение к серверу
ssh root@your-vps-ip

# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установка PostgreSQL 14
apt install -y postgresql postgresql-contrib

# Установка nginx
apt install -y nginx

# Установка PM2 для управления процессами
npm install -g pm2

# Создание пользователя для приложения
useradd -m -s /bin/bash tiermaker
passwd tiermaker
```

---

### Шаг 2: Настройка PostgreSQL

```bash
# Вход в PostgreSQL
sudo -u postgres psql

# Создание БД и пользователя
CREATE DATABASE tiermaker_db;
CREATE USER tiermaker_user WITH PASSWORD 'secure-password-here';
GRANT ALL PRIVILEGES ON DATABASE tiermaker_db TO tiermaker_user;
\q

# Разрешить подключения из приложения (если нужно)
# nano /etc/postgresql/14/main/pg_hba.conf
```

---

### Шаг 3: Деплой приложения

```bash
# Переключение на пользователя приложения
su - tiermaker

# Клонирование репозитория
git clone https://github.com/your-username/tiermaker-pro.git
cd tiermaker-pro

# Установка зависимостей (frontend)
npm install

# Установка зависимостей (backend)
cd backend
npm install

# Настройка environment variables
cd ..
cp .env.example .env.local
# Редактируем .env.local:
# VITE_API_URL=https://your-domain.com/api

# Backend .env
cd backend
cp .env.example .env
# Редактируем .env:
# DATABASE_URL="postgresql://tiermaker_user:secure-password-here@localhost:5432/tiermaker_db"
# JWT_SECRET="generate-random-secret-openssl-rand-base64-32"
# CLIENT_URL=https://your-domain.com
# PORT=8080

# Генерация JWT secret
openssl rand -base64 32

# Запуск миграций БД
npx prisma migrate deploy
npx prisma generate

# Сборка frontend
cd ..
npm run build

# Сборка backend
cd backend
npm run build
```

---

### Шаг 4: Запуск приложения с PM2

```bash
# Backend
cd /home/tiermaker/tiermaker-pro/backend
pm2 start dist/server.js --name tiermaker-backend

# Frontend (если используем Vite preview)
cd /home/tiermaker/tiermaker-pro
pm2 start npm --name tiermaker-frontend -- run preview -- --host 0.0.0.0 --port 3000

# Сохранение конфигурации PM2
pm2 save

# Автозапуск PM2 при загрузке
pm2 startup
# Выполнить команду, которую выведет pm2 startup
```

---

### Шаг 5: Настройка nginx

```bash
# Конфигурация nginx
nano /etc/nginx/sites-available/tiermaker-pro

# Добавить конфигурацию:
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
    }

    # Swagger docs
    location /documentation {
        proxy_pass http://localhost:8080/documentation;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# Включение сайта
ln -s /etc/nginx/sites-available/tiermaker-pro /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

### Шаг 6: SSL сертификат (Let's Encrypt)

```bash
# Установка Certbot
apt install -y certbot python3-certbot-nginx

# Получение сертификата
certbot --nginx -d your-domain.com

# Автообновление сертификата (добавлено в cron автоматически)
# Проверка: certbot renew --dry-run
```

---

### Шаг 7: GitHub Secrets для деплоя

```bash
# На сервере: генерация SSH ключа для GitHub Actions
ssh-keygen -t ed25519 -f /root/.ssh/github_actions -N ""

# Копирование публичного ключа
cat /root/.ssh/github_actions.pub

# Добавление в authorized_keys
cat /root/.ssh/github_actions.pub >> /root/.ssh/authorized_keys

# В GitHub Repository Settings → Secrets and variables → Actions:
# VPS_SSH_KEY: содержимое /root/.ssh/github_actions (приватный ключ)
# VPS_HOST: ваш-vps-ip
# VPS_USER: root
```

---

### Шаг 8: Мониторинг и логи

```bash
# Логи приложения
pm2 logs tiermaker-backend
pm2 logs tiermaker-frontend

# Статус приложения
pm2 status
pm2 monit

# Логи nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Логи PostgreSQL
tail -f /var/log/postgresql/postgresql-14-main.log
```

---

### Автоматический деплой (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Build frontend
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: easingthemes/ssh-deploy@v4
        with:
          SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_KEY }}
          REMOTE_HOST: ${{ secrets.VPS_HOST }}
          REMOTE_USER: ${{ secrets.VPS_USER }}
          SOURCE: dist/
          TARGET: /var/www/tiermaker-pro
          ARGS: "-rltgoDzvO --delete"
          SCRIPT_AFTER: |
            cd /var/www/tiermaker-pro
            npm install --production
            pm2 restart tiermaker-backend
```

---

### Troubleshooting

**Проблема**: Приложение не запускается
```bash
# Проверка логов PM2
pm2 logs --lines 100

# Проверка портов
netstat -tulpn | grep :8080
netstat -tulpn | grep :3000

# Перезапуск приложения
pm2 restart all
```

**Проблема**: 502 Bad Gateway
```bash
# Проверка nginx
nginx -t
systemctl status nginx

# Проверка backend
pm2 status
pm2 restart tiermaker-backend
```

**Проблема**: Ошибки БД
```bash
# Проверка PostgreSQL
systemctl status postgresql

# Проверка подключения
psql -U tiermaker_user -d tiermaker_db -h localhost
```

---

## 📡 Telegram Error Notifications

### Архитектура

```
Backend (Fastify)
    ↓ ошибка
    ├── Logger → /var/log/tiermaker/errors.log (JSON)
    └── ErrorNotifier → Telegram Bot → Ты
```

### Настройка

#### Шаг 1: Создать Telegram бота

1. Открыть Telegram → найти `@BotFather`
2. Отправить `/newbot`
3. Придумать имя: `TierMaker Errors Bot`
4. Получить токен: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
5. Узнать свой user ID: найти `@userinfobot` → отправить любое сообщение → получить ID

#### Шаг 2: Настроить .env

```bash
# backend/.env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=987654321
TELEGRAM_NOTIFICATIONS_ENABLED=true
LOG_DIR=/var/log/tiermaker
```

#### Шаг 3: Запустить сервер

```bash
cd backend
npm run dev

# В консоли увидишь:
# [ErrorNotifier] ✅ Telegram уведомления включены
```

#### Шаг 4: Протестировать

```bash
# Отправить тестовый запрос с ошибкой
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"test"}'

# В Telegram получишь:
# 🚨 *Новая ошибка*
#
# *Сообщение:* `Invalid credentials`
# *URL:* `/api/auth/login`
# *Метод:* `POST`
# *User ID:* `anonymous`
# *Время:* 10.03.2026, 15:30:22
```

### Формат уведомлений

```
🚨 *Новая ошибка*

*Сообщение:* `Cannot read property 'id' of undefined`
*URL:* `/api/tier-lists/123`
*Метод:* `PUT`
*User ID:* `authenticated`

*Время:* 10.03.2026, 15:30:22

*Stack:*
```
TypeError: Cannot read property 'id' of undefined
    at updateTierList (/app/src/modules/tier-lists/tierList.service.ts:45:12)
```
```

### Логирование в файл

**Расположение:**
- Development: логи только в консоль
- Production: `/var/log/tiermaker/app.log` + `/var/log/tiermaker/errors.log`

**Формат (JSON):**
```json
{
  "timestamp": "2026-03-10T12:30:22.000Z",
  "level": "error",
  "message": "TierLists: Cannot read property 'id' of undefined",
  "context": { "userId": "123", "tierListId": "456" },
  "errorStack": "TypeError: Cannot read property 'id' of undefined..."
}
```

**Просмотр логов:**
```bash
# Последние 100 строк
tail -n 100 /var/log/tiermaker/errors.log

# В реальном времени
tail -f /var/log/tiermaker/errors.log

# Поиск по дате
grep "2026-03-10" /var/log/tiermaker/errors.log
```

### Throttling

Уведомления ограничены: **не чаще 1 раза в 5 секунд**.

Это предотвращает спам, если происходит массовый сбой.

### Отключение уведомлений

```bash
# В .env
TELEGRAM_NOTIFICATIONS_ENABLED=false
```

---

## 🎯 Dashboard Enhancements (Март 2026)

### Реализованные улучшения Dashboard

#### 1. Сортировка тир-листов

**Варианты сортировки:**

| Опция | Описание | Реализация |
|-------|----------|------------|
| **Сначала новые** | По дате создания (убывание) | `createdAt desc` |
| **Сначала старые** | По дате создания (возрастание) | `createdAt asc` |
| **По названию (A-Z)** | Алфавитный порядок | `title localeCompare` |
| **По популярности** | По количеству лайков | `likesCount desc` |

**Архитектура:**
```typescript
// types.ts
export type SortOption = 'newest' | 'oldest' | 'title-asc' | 'likes';

// useDashboardState.ts
const { sortOption, setSortOption } = useDashboardState();

// useTierListsPagination.ts
const displayedTierLists = useMemo(() => {
  const sorted = [...filteredTierLists];
  switch (sortOption) {
    case 'newest': return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'likes': return sorted.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    // ...
  }
}, [filteredTierLists, sortOption]);
```

**UI:**
- Кастомный `<select>` с SVG иконкой
- Градиентный фон в стиле Dashboard
- Hover и Focus состояния
- Адаптивность для мобильных

---

#### 2. Фильтры по публичности

**Варианты фильтров:**

| Опция | Описание | Реализация |
|-------|----------|------------|
| **Все** | Показывает все тир-листы | `no filter` |
| **Публичные** | Только `isPublic: true` | `filter(isPublic)` |
| **Приватные** | Только `isPublic: false` | `filter(!isPublic)` |

**Архитектура:**
```typescript
// types.ts
export type FilterOption = 'all' | 'public' | 'private';

// useDashboardState.ts
const { filterOption, setFilterOption } = useDashboardState();

// useTierListsPagination.ts
const filteredTierLists = useMemo(() => {
  let result = allTierLists;
  if (filterOption === 'public') {
    result = result.filter(tierList => tierList.isPublic);
  } else if (filterOption === 'private') {
    result = result.filter(tierList => !tierList.isPublic);
  }
  return result;
}, [allTierLists, filterOption]);
```

**UI:**
- 3 кнопки в виде tabs
- Активная кнопка с градиентом
- Inline-flex контейнер с border
- Плавные transition эффекты

---

#### 3. Комбинированная фильтрация

**Порядок обработки:**
```
1. Поиск по названию (searchQuery)
    ↓
2. Фильтр по публичности (filterOption)
    ↓
3. Сортировка (sortOption)
    ↓
4. Отображение (displayedTierLists)
```

**Хук useTierListsPagination:**
```typescript
const { displayedTierLists } = useTierListsPagination({
  allTierLists: paginatedResponse.data,
  searchQuery,
  sortOption,
  filterOption,
});
```

---

#### 4. Стилизованные компоненты

**CSS классы:**
```css
.dashboard-controls      /* Контейнер фильтров и сортировки */
.dashboard-filters       /* Inline-flex для кнопок */
.dashboard-filter-btn    /* Кнопка фильтра */
.dashboard-filter-btn--active  /* Активная кнопка */
.dashboard-sort          /* Контейнер select */
.dashboard-sort__select  /* Кастомный select */
```

**Дизайн-система:**
- **Цвета**: Тёплые тона (#3c2f2d, #df9f86, #cb86a2)
- **Фон**: Полупрозрачные градиенты
- **Border**: Мягкие границы с rgba
- **Тени**: Box-shadow с низкой прозрачностью
- **Transition**: 0.16-0.18s ease

**Адаптивность:**
```css
@media (max-width: 760px) {
  .dashboard-controls {
    flex-direction: column;
  }
  .dashboard-sort__select {
    width: 100%;
  }
}
```

---

## 🎯 Заключение

**Текущее состояние**: Проект с отличной основой, готов к переходу в production.

**Реализовано (Март 2026)**:
- ✅ Telegram уведомления об ошибках
- ✅ Логирование в файл (JSON format)
- ✅ Сортировка тир-листов (4 варианта)
- ✅ Фильтры по публичности (3 варианта)
- ✅ Комбинированная фильтрация (поиск + фильтр + сортировка)
- ✅ Стилизованные UI компоненты

**Критичные проблемы**: CI/CD, health check endpoint, backend тесты, VPS настройка.

**Следующий шаг**: Выполнить **НЕДЕЛЮ 1** (CI/CD & Monitoring) для автоматизации деплоя.

**Прогноз**: Через 3 недели интенсивной работы проект достигнет **90/100** и будет готов к масштабированию на VPS.

---

**Last Updated**: 10 марта 2026 г.  
**Next Review**: После завершения Недели 1  
**Owner**: Development Team  
**Deployment Target**: VPS (Ubuntu 22.04 LTS)  
**Error Tracking**: Telegram + File Logging  
**Dashboard Features**: Sort (4) × Filter (3) × Search