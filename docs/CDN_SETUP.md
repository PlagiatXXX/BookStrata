# CDN Setup — Yandex Cloud CDN + Object Storage

## Статус: ✅ Работает

---

## Общая схема

```
Загрузка:   Ты → Бэкенд → Бакет (S3 object storage)
Выдача:     Браузер → CDN (cdn.bookstrata.ru) → если кеш пуст → Бакет
                                                    ↓
                                                Кеш на edge-сервере
```

---

## ✅ Что сделано

### 1. Yandex Object Storage (бакет)

| Параметр | Значение |
|----------|----------|
| Имя бакета | `bookstrata-images` |
| Эндпоинт | `https://storage.yandexcloud.net` |
| Регион | `ru-central1` |
| CORS | Настроен ✅ |
| Доступ | **200 OK** ✅ |

### 2. Сертификат (Certificate Manager)

| Параметр | Значение |
|----------|----------|
| Имя | `cdn-bookstrata` |
| Домен | `cdn.bookstrata.ru` |
| Провайдер | `LETS_ENCRYPT` |
| Статус | **Issued** ✅ |
| Начало | 29.05.2026 |
| Окончание | 27.08.2026 |

### 3. CDN-ресурс

| Параметр | Значение |
|----------|----------|
| ID | `bc8r44ndp4kwhq5x3qh5` |
| Основной домен | `cdn.bookstrata.ru` |
| Группа источников | `s3-bookstrata-images` |
| Протокол источников | HTTPS |
| HTTP→HTTPS | Включено |
| Сертификат | Let's Encrypt ✅ |
| Кеширование | Настроено ✅ |
| Статус | **Активен** ✅ |

Проверка:

```bash
curl -svI https://cdn.bookstrata.ru/ 2>&1 | grep -E "CN=|subjectAltName"
# → CN=cdn.bookstrata.ru
# → subjectAltName: "cdn.bookstrata.ru" — совпадает ✅
```

### 4. DNS (reg.ru)

| Тип | Имя | Значение |
|-----|-----|----------|
| CNAME | `cdn` | `23c361de579d5401.topology.gslb.yccdn.ru.` |
| TXT | `_acme-challenge.cdn` | токен Let's Encrypt |
| A | `@` | `95.163.244.138` |
| A | `www` | `95.163.244.138` |

### 5. Код (backend)

- `backend/.env` — `STORAGE_PROVIDER=yandex`, `YC_PUBLIC_HOST=cdn.bookstrata.ru`
- `backend/src/lib/storage/index.ts` — выбирает провайдера (`yandex`/`cloudinary`)
- `backend/src/lib/storage/yandex-storage.ts` — загружает в бакет, URL: `https://cdn.bookstrata.ru/{key}`
- `backend/src/lib/cloudinary.ts` — прокси-обёртка для обратной совместимости

Фронтенд получает готовые URL с бэкенда — своих адресов не хранит.

---

## 📊 Бесплатные лимиты (free tier) на месяц

### Yandex Object Storage

| Ресурс | Бесплатно | Цена после лимита |
|--------|-----------|-------------------|
| Хранение (STANDARD) | **1 ГБ** | ~1,84 ₽/ГБ |
| PUT/POST/PATCH/LIST | **10 000** | ~0,11 ₽/1000 |
| GET/HEAD/OPTIONS | **100 000** | ~0,03 ₽/1000 |
| Исходящий трафик | **100 ГБ** | ~1,17 ₽/ГБ |

### Yandex Cloud CDN

| Ресурс | Бесплатно | Цена после лимита |
|--------|-----------|-------------------|
| Исходящий трафик | **100 ГБ** (включено в Object Storage) | ~1,2 ₽/ГБ |
| Входящий трафик на CDN | **∞** | бесплатно |

### Примерный запас прочности (бесплатно)

| Параметр | Пример |
|----------|--------|
| Изображений в бакете | ~5 000–20 000 (до 1 ГБ) |
| Загрузок в месяц | ~10 000 |
| Просмотров страниц | ~100 000 (через CDN ≈ 100 000 GET к бакету при промахах кеша) |
| Пользователей* | ~1 000 при средней активности |
| Трафик | ~100 ГБ исходящего (~1 млн просмотров) |

> *С CDN-кешем большинство запросов отдаётся с edge-серверов, не добираясь до бакета. Лимит GET к бакету (100 000) — это только **промахи кеша**.

Когда упрёшься в лимит — платить начнёшь копейки:
- 1 ГБ хранения сверх лимита — ~1,84 ₽
- 1 000 000 просмотров сверх трафика — ~1 171 ₽

---

## Файлы конфигурации

| Файл | Назначение |
|------|------------|
| `backend/.env` | `STORAGE_PROVIDER`, `YC_PUBLIC_HOST`, ключи доступа |
| `backend/src/lib/storage/index.ts` | Выбор провайдера |
| `backend/src/lib/storage/yandex-storage.ts` | Yandex S3 + CDN |
| `backend/src/lib/cloudinary.ts` | Прокси (backward compat) |
