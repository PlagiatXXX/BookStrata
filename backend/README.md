# Backend Docker / Redis Setup

Этот проект уже настроен на работу с Redis для кеширования. На macOS дополнительная настройка Docker обычно не требуется — достаточно запустить сервис Redis из папки `backend`.

## Что уже сделано

- В `backend/docker-compose.yml` добавлен сервис `redis`.
- В `backend/.env` уже указано:

```env
REDIS_URL=redis://localhost:6379
```

- В `backend/src/lib/redis.ts` приложение использует `ioredis` и подключается по `REDIS_URL`.

## Запуск Redis

Открой терминал и перейди в папку backend:

```bash
cd /Users/fedor/Bookstrata/BookStrata/backend
```

Запусти Redis через Docker Compose:

```bash
docker compose up -d
```

Сервис будет доступен на `localhost:6379`.

## Проверка

После запуска backend должен вывести в консоль:

```text
✅ Redis connected
```

Если ты запускаешь backend в режиме разработки:

```bash
npm run dev
```

## Остановка Redis

```bash
docker compose down
```

## Альтернатива без docker-compose

Если хочешь просто запустить контейнер Redis вручную:

```bash
docker run -d --name bookstrata-redis -p 6379:6379 redis:7
```

## Права доступа / настройки

На macOS с Docker Desktop специальных дополнительных настроек не требуется. Если порт `6379` занят, можно изменить публикацию порта в `docker-compose.yml` или в команде `docker run`.

## Если Redis недоступен

Код кеша написан так, чтобы при ошибках Redis приложение продолжало работать. Это означает, что если Redis не стартует, функционал не сломается — просто кеширование будет пропущено.

---

Если хочешь, могу дополнительно добавить раздел в корневой `README.md` или настроить `docker compose` для всего проекта.
