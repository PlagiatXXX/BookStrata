# Справочник API (API Reference)

Базовый URL: `/api`

## Аутентификация

### POST `/auth/register`
Регистрация нового пользователя.
- **Body**: `{ username, email, password }`
- **Response**: `201 { token, user }`

### POST `/auth/login`
Вход в систему.
- **Body**: `{ email, password }`
- **Response**: `200 { token, user }`

## Тир-листы

### GET `/tier-lists`
Получение списка тир-листов текущего пользователя (пагинация).
- **Query**: `page, limit, search`
- **Response**: `200 { data: TierList[], meta }`

### POST `/tier-lists`
Создание нового тир-листа.
- **Body**: `{ title, templateId? }`

### GET `/tier-lists/:id`
Получение детальной информации о тир-листе.

### PUT `/tier-lists/:id`
Обновление тир-листа (поддерживает частичные обновления).

### DELETE `/tier-lists/:id`
Удаление тир-листа.

## Книги и Поиск

### GET `/books/search`
Поиск книг через Google Books.
- **Query**: `q` (поисковый запрос)
- **Response**: `200 { items: Book[] }`

## Сообщество

### GET `/community/templates`
Список доступных шаблонов.

### GET `/community/public`
Список публичных тир-листов других пользователей.

---

*Полная интерактивная документация доступна по адресу `http://localhost:8080/documentation` в режиме разработки (Swagger).*
