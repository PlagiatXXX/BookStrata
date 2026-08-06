# Справочник API (API Reference)

> ⚠️ **Важно:** это краткий обзор основных ресурсов. Полная, актуальная и интерактивная документация генерируется из `@openapi`-аннотаций и доступна в Swagger UI: **`http://localhost:8080/documentation`** (в продакшене — `/documentation` через nginx). При добавлении новых эндпоинтов обновляйте **именно Swagger**, а не этот файл.

Базовый URL API: `/api/*` (проксируется на backend, порт `8080`).

## Аутентификация
- `POST /api/auth/register` — регистрация `{ username, email, password }` → `201 { token, user }`
- `POST /api/auth/login` — вход `{ email, password }` → `200 { token, user }`
- `GET /api/auth/me` — текущий пользователь
- `POST /api/auth/logout` — выход

## Тир-листы
- `GET /api/tier-lists` — мои тир-листы (пагинация: `page`, `limit`, `search`)
- `POST /api/tier-lists` — создать `{ title, templateId? }`
- `GET /api/tier-lists/:id` — детали
- `PUT /api/tier-lists/:id` — обновить
- `DELETE /api/tier-lists/:id` — удалить
- `GET /api/tier-lists/public` — публичные тир-листы сообщества
- `PUT /api/tier-lists/:id/placements` — сохранить позиции книг
- `POST /api/tier-lists/:id/like` / `DELETE /api/tier-lists/:id/like` — лайки

## Книги и поиск
- `GET /api/books/search` — поиск книг через Google Books (`q`)
- **LiveLib импорт** — `GET /api/livelib/*` (по username)

## Шаблоны
- `GET /api/templates`, `POST /api/templates`, `GET/PUT/DELETE /api/templates/:id`

## Пользователи
- `GET /api/users/me` — профиль; `GET /api/users/me/stats` — статистика
- `PUT/DELETE /api/users/me/avatar`, `POST /api/users/me/avatar/upload`
- `GET /api/users/:id` — публичный профиль; `GET /api/users/:id/tier-lists`
- `PUT /api/users/me/password` — смена пароля

## Сообщество
- **Форум/обсуждения** — `GET/POST /api/discussions/*` (топики, сообщения, закрепление/удаление модераторами)
- **Баттлы** — `GET/POST /api/battles/*` (участники, голосования, еженедельные соревнования)
- **Новости** — `GET /api/news/*`; **внешние новости** — `GET /api/external-news/*`
- **Коллекции** — `GET /api/collections` (список, slug-адреса для prerender'а); **знаменитости** — `GET /api/celebrities/:slug`
- **Авторы** — `GET /api/authors/*`
- **Донаты** — `GET /api/donors` (список благодарностей)

## AI-библиотекарь (Букстраж)
- `POST /api/ai/*` — рекомендации (провайдеры: OpenRouter / кастомный)

## Служебные
- `GET /api/sitemap.xml` → **`/sitemap.xml`** — генерация sitemap (без `/api`, через nginx)
- `GET /api/rss` → **`/rss.xml`** — RSS-лента
- `GET /api/health` — healthcheck
- `GET /api/analytics/*` — аналитика (админ)
- `GET /api/proxy`, `/api/image-proxy` — проксирование внешних ресурсов и изображений