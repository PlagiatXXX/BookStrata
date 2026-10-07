# Swagger API Documentation — BookStrata

## 📍 Обзор

Swagger документация доступна по адресу: **http://localhost:8080/documentation** (в development режиме)

## 🔧 Настройка

### 1. Конфигурация сервера

Файл: `backend/src/server.ts`

```typescript
await fastify.register(swagger, {
  swagger: {
    info: {
      title: 'BookStrata API',
      description: 'API для создания и управления ранжирующими списками книг',
      version: '1.0.0',
    },
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: "JWT токен в формате: Bearer <token>"
      }
    },
  },
  openapi: {
    info: { ... },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    }
  },
  mode: 'dynamic',
});
```

### 2. Добавление документации к роутам

Используйте JSDoc комментарии с аннотацией `@openapi`:

```typescript
/**
 * @openapi
 * /api/tier-lists/:
 *   get:
 *     summary: Получить мои тир-листы
 *     description: Возвращает список тир-листов текущего пользователя
 *     tags: [Tier Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Успешный ответ
 */
fastify.get('/', handler);
```

### 3. Определения схем

Файл: `backend/src/swagger.ts`

Определяйте общие схемы в отдельном файле:

```typescript
/**
 * @openapi
 * components:
 *   schemas:
 *     TierList:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 */
```

## 📚 Доступные эндпоинты

### Authentication
- `POST /api/auth/register` — Регистрация (авто-логин, токены в ответе)
- `POST /api/auth/login` — Вход (по username или email)
- `POST /api/auth/validate` — Валидация access-токена
- `POST /api/auth/logout` — Выход (отзыв токена)
- `POST /api/auth/forgot-password` — Запрос сброса пароля
- `POST /api/auth/reset-password` — Сброс пароля по токену
- `GET /api/auth/oauth/vk`, `GET /api/auth/oauth/google` — OAuth-вход (VK/Google)

### Tier Lists
- `GET /api/tier-lists` — Мои тир-листы (включая приватные)
- `POST /api/tier-lists` — Создать тир-лист
- `GET /api/tier-lists/:id` — Получить по ID
- `PUT /api/tier-lists/:id` — Обновить
- `DELETE /api/tier-lists/:id` — Удалить
- `GET /api/tier-lists/public` — Публичные тир-листы
- `GET /api/tier-lists/liked` — Лайкнутые тир-листы пользователя
- `POST /api/tier-lists/:id/books` — Добавить книги
- `POST /api/tier-lists/:id/books/search` — Добавить книгу по данным из внешнего источника
- `DELETE /api/tier-lists/:id/books/:bookId` — Удалить книгу
- `PUT /api/tier-lists/:id/placements` — Сохранить позиции
- `PUT /api/tier-lists/:id/tiers` — Сохранить тиры

### Likes
- `GET /api/tier-lists/:id/likes` — Получить лайки
- `POST /api/tier-lists/:id/like` — Лайкнуть
- `DELETE /api/tier-lists/:id/like` — Удалить лайк

### Templates
- `GET /api/templates` — Все шаблоны
- `POST /api/templates` — Создать шаблон
- `GET /api/templates/:id` — Получить по ID
- `PUT /api/templates/:id` — Обновить
- `DELETE /api/templates/:id` — Удалить

### Users
- `GET /api/users/me` — Профиль текущего пользователя
- `GET /api/users/me/stats` — Статистика пользователя
- `PUT /api/users/me` — Обновить профиль
- `PUT /api/users/me/password` — Сменить пароль
- `GET /api/users/me/genre-preferences` — Жанровые предпочтения (7-я ось Book Match)
- `PUT /api/users/me/genre-preferences` — Сохранить выбранные жанры
- `GET /api/users/:id` — Публичный профиль
- `GET /api/users/:id/tier-lists` — Публичные тир-листы пользователя
- `GET /api/users/:id/badges` — Бейджи пользователя (публичные)
- `GET /api/users/search?q=` — Поиск пользователей по нику
- `PUT /api/users/me/avatar` — Обновить аватар
- `DELETE /api/users/me/avatar` — Удалить аватар
- `POST /api/users/me/avatar/upload` — Загрузить аватар

### Books
- `GET /api/books/search` — Поиск книг (Google Books API)
- `GET /api/books/catalog-search` — Публичный поиск по каталогу BookStrata
- `GET /api/books/site-search` — Поиск по каталогу в формате OpenLibraryBook
- `GET /api/books/trending` — Трендовые книги недели
- `GET /api/books/match?genres=` — Подбор книг (Book Match, с жанровой осью)
- `POST /api/books/livelib-import` — Импорт книг из LiveLib

### Authors
- `GET /api/authors` — Список авторов каталога (`sort=name|popular`)
- `GET /api/authors/search?q=` — Поиск авторов
- `GET /api/authors/:slug` — Данные страницы автора (SEO-лендинг)

### Shelf
- `GET /api/shelf` — Вся полка текущего пользователя
- `GET /api/shelf/books` — Полка с данными книг
- `PUT /api/shelf/books/:bookId` — Установить/переключить статус
- `DELETE /api/shelf/books/:bookKey` — Снять отметку
- `POST /api/shelf/import` — Merge гостевой полки в аккаунт

### Admin Books (только admin)
- `GET /api/admin/books` — Листинг с фильтрами
- `POST /api/admin/books` — Создание новой книги (draft)
- `GET /api/admin/books/:id` — Полная книга
- `PATCH /api/admin/books/:id` — Правка полей + slug
- `POST /api/admin/books/:id/enrich` — Обогащение из Google Books
- `POST /api/admin/books/:id/merge` — Ручной merge дублей
- `POST /api/admin/books/:id/publish` — Публикация
- `POST /api/admin/books/:id/unpublish` — Возврат в draft

### Admin Authors (только admin)
- `GET /api/admin/authors?q=` — Список авторов с флагами контента
- `GET /api/admin/authors/:id/content` — Контент страницы автора для редактора
- `PUT /api/admin/authors/:id/content` — Сохранение контента одной транзакцией

### AI-библиотекарь
- `POST /api/ai/librarian/chat` — Чат-рекомендации (авторизация; провайдеры: OpenRouter → кастомный → abliteration.ai → streaming)
- `GET /api/ai/librarian/status` — Статус провайдеров (пробная генерация с кэшем 60с)

### Avatars (AI)
- `POST /api/avatars/generate` — Сгенерировать AI аватар
- `GET /api/avatars/limit` — Получить лимит AI генераций

## 🔐 Авторизация

Все запросы к защищённым эндпоинтам требуют JWT токен:

```http
Authorization: Bearer <your-jwt-token>
```

## 📊 Лимиты

### Книги в тир-листе
- **Без лимитов** — все функции бесплатны, Pro-тариф отменён (страница «Поддержать проект» `/pricing`)

### AI аватары
- **Лимит:** 10 генераций в день (`DAILY_LIMIT` в `avatars/avatar.service.ts`)

### Rate Limiting
- **Лимит:** 200 запросов в минуту для авторизованных, 30 для гостей (переопределяется env `RATE_LIMIT_MAX`; fallback на in-memory store без Redis)
- **Ответ при превышении:** 429 Too Many Requests

### Размер запроса
- **Максимум:** 10MB (для base64 изображений)

## 🧪 Тестирование

### Пример запроса (curl):

```bash
# Получить мои тир-листы
curl -X GET "http://localhost:8080/api/tier-lists?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Создать тир-лист
curl -X POST "http://localhost:8080/api/tier-lists" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Мои любимые книги 2024"}'

# Добавить книги
curl -X POST "http://localhost:8080/api/tier-lists/1/books" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "books": [
      {
        "title": "1984",
        "author": "George Orwell",
        "coverImageUrl": "https://example.com/cover.jpg"
      }
    ]
  }'
```

### Пример ответа:

```json
{
  "data": [
    {
      "id": 1,
      "title": "Мои любимые книги 2024",
      "createdAt": "2024-03-13T10:00:00.000Z",
      "isPublic": false,
      "booksCount": 15,
      "likesCount": 3
    }
  ],
  "meta": {
    "totalItems": 1,
    "itemCount": 1,
    "itemsPerPage": 10,
    "totalPages": 1,
    "currentPage": 1
  }
}
```

## ❌ Обработка ошибок

### Стандартный формат ошибок:

```json
{
  "message": "Описание ошибки",
  "error": "Тип ошибки",
  "statusCode": 400
}
```

### Коды ошибок:

| Код | Описание |
|-----|----------|
| 200 | Успех |
| 201 | Создано |
| 400 | Ошибка валидации / Лимит превышен |
| 401 | Не авторизован |
| 403 | Доступ запрещён |
| 404 | Не найдено |
| 409 | Конфликт (дубликат) |
| 429 | Слишком много запросов |
| 500 | Внутренняя ошибка сервера |

## 📝 Best Practices

1. **Всегда используйте @openapi аннотации** для новых эндпоинтов
2. **Документируйте все параметры** и ответы
3. **Указывайте примеры** использования
4. **Описывайте возможные ошибки** и их коды
5. **Обновляйте swagger.ts** при добавлении новых схем

## 🔗 Полезные ссылки

- [Swagger UI](http://localhost:8080/documentation)
- [OpenAPI Specification](https://swagger.io/specification/)
- [@fastify/swagger](https://github.com/fastify/fastify-swagger)
- [@fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui)

---

**Last Updated:** 7 октября 2026 г.  
**Version:** 1.1.0 (Unreleased)
