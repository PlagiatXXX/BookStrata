# Backend Setup & Docker

Этот проект использует PostgreSQL и Redis. Для удобства локальной разработки настроен Docker Compose.

## Запуск инфраструктуры

Открой терминал и перейди в папку backend:

```bash
cd backend
docker compose up -d
```

Это запустит:
- **PostgreSQL** на порту 5432 (User: user, Password: password, DB: bookstrata)
- **Redis** на порту 6379

## Настройка окружения (.env)

Убедитесь, что в backend/.env прописаны правильные URL:

DATABASE_URL="postgresql://user:password@localhost:5432/bookstrata?schema=public"
REDIS_URL="redis://localhost:6379"

## Инициализация БД

После запуска контейнеров выполните миграции и сидирование:

npm run migrate
npm run seed

## Запуск приложения

Запустите сервер в режиме разработки: npm run dev

---
*Примечание для macOS: Убедитесь, что Docker Desktop запущен.*
