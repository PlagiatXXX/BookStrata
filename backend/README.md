# Backend Docker / Redis Setup

Этот проект уже настроен на работу с PostgreSQL и Redis через Docker Compose. На macOS дополнительная настройка Docker обычно не требуется — достаточно запустить сервисы из папки `backend`.

## Что уже сделано

- В `backend/docker-compose.yml` добавлены сервисы `postgres` и `redis`.
- В `backend/.env` уже указано:

```env
DATABASE_URL="postgresql://bookstrata:bookstrata_pass@localhost:5432/bookstrata"
REDIS_URL=redis://localhost:6379
```

- В `backend/src/lib/redis.ts` приложение использует `ioredis` и подключается по `REDIS_URL`.

## Запуск

Открой терминал и перейди в папку backend:

```bash
cd /Users/fedor/Bookstrata/BookStrata/backend
```

Запусти сервисы через Docker Compose:

```bash
docker compose up -d
```

- PostgreSQL будет доступен на `localhost:5432`
- Redis будет доступен на `localhost:6379`

## Инициализация базы данных

После запуска PostgreSQL нужно применить миграции и засеять данные:

```bash
npx prisma migrate dev
npx prisma db seed
```

## Проверка

После запуска backend должен вывести в консоль:

```text
✅ Redis connected
```

Если ты запускаешь backend в режиме разработки:

```bash
npm run dev
```

## Остановка

```bash
docker compose down
```

## Альтернатива без docker-compose

Если хочешь просто запустить контейнеры вручную:

```bash
docker run -d --name bookstrata-postgres -p 5432:5432 -e POSTGRES_USER=bookstrata -e POSTGRES_PASSWORD=bookstrata_pass -e POSTGRES_DB=bookstrata postgres:16-alpine
docker run -d --name bookstrata-redis -p 6379:6379 redis:7
```

## Если Redis недоступен

Код кеша написан так, чтобы при ошибках Redis приложение продолжало работать. Это означает, что если Redis не стартует, функционал не сломается — просто кеширование будет пропущено.

---

Если хочешь, могу дополнительно добавить раздел в корневой `README.md` или настроить `docker compose` для всего проекта.
