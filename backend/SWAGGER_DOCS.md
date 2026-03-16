# Swagger API Documentation — BookStrata Pro

## 📍 Обзор

Swagger документация доступна по адресу: **http://localhost:8080/documentation** (в development режиме)

## 🔧 Настройка

### 1. Конфигурация сервера

Файл: `backend/src/server.ts`

```typescript
await fastify.register(swagger, {
  swagger: {
    info: {
      title: 'BookStrata Pro API',
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
- `POST /api/auth/register` — Регистрация
- `POST /api/auth/login` — Вход
- `GET /api/auth/me` — Текущий пользователь
- `POST /api/auth/logout` — Выход

### Tier Lists
- `GET /api/tier-lists` — Мои тир-листы
- `POST /api/tier-lists` — Создать тир-лист
- `GET /api/tier-lists/:id` — Получить по ID
- `PUT /api/tier-lists/:id` — Обновить
- `DELETE /api/tier-lists/:id` — Удалить
- `GET /api/tier-lists/public` — Публичные тир-листы
- `POST /api/tier-lists/:id/books` — Добавить книги (макс. 20)
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
- `PUT /api/users/me/avatar` — Обновить аватар
- `DELETE /api/users/me/avatar` — Удалить аватар
- `POST /api/users/me/avatar/upload` — Загрузить аватар

### Books
- `GET /api/books/search` — Поиск книг (Google Books API)

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
- **Бесплатно:** Максимум 20 книг
- **Pro:** Без ограничений (в разработке)

### AI аватары
- **Бесплатно:** 10 генераций в день
- **Pro:** Без ограничений (в разработке)

### Rate Limiting
- **Лимит:** 100 запросов в минуту
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

# Добавить книги (макс. 20)
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

**Last Updated:** 13 марта 2026 г.  
**Version:** 1.0.0
