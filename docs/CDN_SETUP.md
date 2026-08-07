# CDN Setup — Timeweb Cloud S3 + CDN

## Статус: ✅ Работает

---

## Общая схема

```
Загрузка:   Ты → Бэкенд → Бакет (Timeweb Cloud S3, s3.twcstorage.ru)
Выдача:     Браузер → CDN (re406cj9uj.cdn.twcstorage.ru) → если кеш пуст → Бакет
                                                    ↓
                                                Кеш на edge-сервере
```

---

## ✅ Что настроено (по факту на проде)

### 1. Timeweb Cloud S3 (бакет)

| Параметр | Значение |
|----------|----------|
| Имя бакета | `bookstrata` |
| Эндпоинт | `https://s3.twcstorage.ru` |
| Регион | `ru-1` |
| Доступ | статический ключ `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` из `.env` |

### 2. CDN

| Параметр | Значение |
|----------|----------|
| CDN-хост | `re406cj9uj.cdn.twcstorage.ru` |
| Назначение | зеркалирует бакет, отдаёт закэшированные картинки клиентам |
| Зачем | raw-S3 (`s3.twcstorage.ru`) — одиночный РФ-IP, недоступен клиентам через зарубежные VPN; CDN раздаёт картинки глобально |

### 3. Код (backend)

- `backend/.env` — `STORAGE_PROVIDER=s3`, `S3_ENDPOINT=https://s3.twcstorage.ru`, `S3_REGION=ru-1`, `S3_PUBLIC_HOST=s3.twcstorage.ru`, `CDN_PUBLIC_HOST=re406cj9uj.cdn.twcstorage.ru`
- `backend/src/lib/storage/index.ts` — выбирает провайдера (`s3`/`local`)
- `backend/src/lib/storage/s3-storage.ts` — загружает в бакет (S3-совместимая API, sharp → webp)
- `backend/src/lib/upload.ts` — прокси-обёртка над активным хранилищем

Фронтенд получает готовые URL с бэкенда — своих адресов не хранит.

### 4. DNS

CNAME/CDN-домен для раздачи (`cdn.bookstrata.ru` → CDN) настраивается в кабинете
Timeweb Cloud / у регистратора. Текущие записи — уточнять в панели Timeweb
(в коде CDN-хост задаётся через `CDN_PUBLIC_HOST`).

---

## Проверка

```bash
# Что реально отдаёт CDN (например, обложка из бакета):
docker exec bookstrata-api printenv S3_ENDPOINT S3_PUBLIC_HOST S3_REGION CDN_PUBLIC_HOST

# Ссылки в БД должны указывать на twcstorage.ru, а не на сторонние хостинги:
docker exec -it bookstrata-postgres psql -U bookstrata -d bookstrata -c \
"SELECT 'User' AS t, COUNT(*) FILTER (WHERE avatar_url LIKE '%twcstorage%') AS tw FROM \"User\" \
UNION ALL SELECT 'Book', COUNT(*) FILTER (WHERE cover_image_url LIKE '%twcstorage%') FROM \"Book\" \
UNION ALL SELECT 'tier_lists', COUNT(*) FILTER (WHERE cover_image_url LIKE '%twcstorage%') FROM tier_lists \
UNION ALL SELECT 'collections', COUNT(*) FILTER (WHERE cover_image_url LIKE '%twcstorage%') FROM collections;"
```

---

## Файлы конфигурации

| Файл | Назначение |
|------|------------|
| `backend/.env` | `STORAGE_PROVIDER`, `S3_*`, `CDN_PUBLIC_HOST`, ключи доступа |
| `backend/src/lib/storage/index.ts` | Выбор провайдера |
| `backend/src/lib/storage/s3-storage.ts` | Timeweb S3 + CDN |
| `backend/src/lib/upload.ts` | Прокси (backward compat) |
