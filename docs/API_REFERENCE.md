# Справочник API (API Reference)

> ⚠️ **Важно:** это краткий обзор основных ресурсов. Полная, актуальная и интерактивная документация генерируется из `@openapi`-аннотаций и доступна в Swagger UI: **`http://localhost:8080/documentation`** (в продакшене — `/documentation` через nginx). При добавлении новых эндпоинтов обновляйте **именно Swagger**, а не этот файл.

Базовый URL API: `/api/*` (проксируется на backend, порт `8080`).

## Аутентификация
- `POST /api/auth/register` — регистрация `{ username, email, password }` → авто-логин, токены в ответе
- `POST /api/auth/login` — вход по username или email `{ username?, email?, password }`
- `POST /api/auth/validate` — валидация access-токена
- `POST /api/auth/logout` — выход; `POST /api/auth/forgot-password`, `/reset-password` — восстановление пароля
- `GET /api/auth/oauth/vk`, `/oauth/google` — OAuth-вход (VK/Google)

## Тир-листы
- `GET /api/tier-lists` — мои тир-листы (пагинация: `page`, `limit`, `search`)
- `POST /api/tier-lists` — создать `{ title, templateId? }`
- `GET /api/tier-lists/:id` — детали
- `PUT /api/tier-lists/:id` — обновить
- `DELETE /api/tier-lists/:id` — удалить
- `GET /api/tier-lists/public` — публичные тир-листы сообщества
- `GET /api/tier-lists/liked` — лайкнутые тир-листы пользователя
- `PUT /api/tier-lists/:id/placements` — сохранить позиции книг
- `POST /api/tier-lists/:id/like` / `DELETE /api/tier-lists/:id/like` — лайки

## Книги и поиск
- `GET /api/books/search` — поиск книг через Google Books (`q`)
- `GET /api/books/catalog-search`, `/site-search` — поиск по каталогу BookStrata
- `GET /api/books/trending` — трендовые книги недели
- `GET /api/books/match` — подбор книг (Book Match; параметр `genres` — жанровая ось)
- **LiveLib импорт** — `POST /api/books/livelib-import` (по username)
- **Полка** — `GET /api/shelf`, `GET /api/shelf/books`, `PUT/DELETE /api/shelf/books/:id`, `POST /api/shelf/import`

## Авторы
- `GET /api/authors` — список авторов (`sort=name|popular`)
- `GET /api/authors/search?q=` — поиск авторов
- `GET /api/authors/:slug` — данные SEO-страницы автора

## Шаблоны
- `GET /api/templates`, `POST /api/templates`, `GET/PUT/DELETE /api/templates/:id`

## Пользователи
- `GET /api/users/me` — профиль; `GET /api/users/me/stats` — статистика
- `GET/PUT /api/users/me/genre-preferences` — жанровые предпочтения (7-я ось Book Match)
- `PUT/DELETE /api/users/me/avatar`, `POST /api/users/me/avatar/upload`
- `GET /api/users/:id` — публичный профиль; `GET /api/users/:id/tier-lists`
- `PUT /api/users/me/password` — смена пароля; `GET /api/users/search?q=` — поиск по нику

## Сообщество
- **Форум/обсуждения** — `GET/POST /api/discussions/*` (топики, сообщения, закрепление/удаление модераторами)
- **Баттлы** — `GET/POST /api/battles/*` (участники, голосования, еженедельные соревнования)
- **Новости** — `GET /api/news/*`; **внешние новости** — `GET /api/external-news/*`
- **Коллекции** — `GET /api/collections` (список, slug-адреса для prerender'а); **знаменитости** — `GET /api/celebrities/:slug`
- **Авторы** — `GET /api/authors/*` (см. раздел «Авторы»)
- **Донаты** — `GET /api/donors` (список благодарностей)

## Админка (только admin)
- `GET/POST /api/admin/books`, `GET/PATCH /api/admin/books/:id` — CRUD книг (enrich, merge, publish/unpublish)
- `GET /api/admin/authors`, `GET/PUT /api/admin/authors/:id/content` — контент страниц авторов
- `GET /api/admin/analytics/*` — метрики, retention, воронка

## AI-библиотекарь (Букстраж)
- `POST /api/ai/librarian/chat` — чат-рекомендации (провайдеры: OpenRouter → кастомный → abliteration.ai → streaming)
- `GET /api/ai/librarian/status` — статус провайдеров (пробная генерация, кэш 60с)

## Служебные
- `GET /api/sitemap.xml` → **`/sitemap.xml`** — генерация sitemap (без `/api`, через nginx)
- `GET /api/rss` → **`/rss.xml`** — RSS-лента
- `GET /api/health` — healthcheck
- `GET /api/analytics/*` — аналитика (админ)
- `GET /api/proxy`, `/api/image-proxy` — проксирование внешних ресурсов и изображений