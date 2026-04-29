# 🔐 SECURITY GUIDE — BookStrata Pro

**Целевой уровень**: OWASP Top 10 + CWE Top 25  
**Версия**: 1.0  
**Дата**: 28 апреля 2026

---

## Status Update - 2026-04-28

- Completed: tier list creation responses now include `newAchievements`.
- Completed: review update responses now include `newAchievements`.
- Completed: `.gitignore` now keeps `.github/copilot-instructions.md` and workflows versioned.
- Clarification: Google Books search currently uses `URL` and `searchParams`; remaining work is input validation, normalization, and request hardening rather than a confirmed SQL injection bug.
- Still pending: CSRF protection and HttpOnly auth cookie migration.


## 🚨 КРИТИЧНЫЕ УЯЗВИМОСТИ (MUST FIX)

### 1️⃣ CSRF Attack Prevention

**Статус**: ❌ НЕ РЕАЛИЗОВАНО  
**CVSS Score**: 8.1 (HIGH)  
**Влияние**: POST/PUT/DELETE запросы уязвимы для подделки

#### Проблема
```typescript
// ❌ УЯЗВИМО - нет CSRF токена
fastify.post('/tier-lists', async (request, reply) => {
  // Злоумышленник может сделать запрос от имени пользователя с другого сайта
  const tierList = await service.createTierList(userId, request.body.title);
  return reply.send(tierList);
});
```

#### Решение

**Шаг 1**: Установить CSRF пакет
```bash
npm install @fastify/csrf-protection
# или более простой вариант
npm install csurf
```

**Шаг 2**: Регистрация в backend
```typescript
// backend/src/server.ts
import csrf from '@fastify/csrf-protection';

await fastify.register(csrf, {
  cookieOpts: {
    signed: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'Strict', // Предотвращает cross-site cookie
  },
  getUserInfo: async (request) => request.user?.userId,
});

// Добавляем CSRF токен в ответ при инициализации
fastify.get('/api/csrf-token', async (request, reply) => {
  return {
    token: await request.csrfToken()
  };
});
```

**Шаг 3**: Обновить frontend
```typescript
// src/lib/api-client.ts
let csrfToken: string | null = null;

export async function initCSRFToken() {
  const response = await fetch(`${API_BASE_URL}/csrf-token`);
  const data = await response.json();
  csrfToken = data.token;
}

async function request<T>(
  method: string,
  path: string,
  data?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
  };

  // ✅ Добавляем CSRF токен для небезопасных операций
  if (['POST', 'PUT', 'DELETE'].includes(method) && csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  return handleResponse<T>(response);
}

// Инициализируем при загрузке приложения
initCSRFToken().catch(console.error);
```

**Тест**:
```bash
# Должен вернуть 403 Forbidden
curl -X POST http://localhost:8080/api/tier-lists \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}' \
  # БЕЗ x-csrf-token
```

---

### 2️⃣ HttpOnly JWT Cookies (XSS Protection)

**Статус**: ❌ JWT в localStorage  
**CVSS Score**: 7.5 (HIGH)  
**Влияние**: XSS может украсть JWT токен

#### Проблема
```typescript
// ❌ УЯЗВИМО
localStorage.setItem('authToken', jwt); // XSS может украсть!
```

#### Решение

**Шаг 1**: Backend - установить cookie
```typescript
// backend/src/modules/auth/auth.route.ts
fastify.post('/login', async (request, reply) => {
  const { username, password } = request.body;
  
  // ... валидация
  
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // ✅ ПРАВИЛЬНО - HttpOnly cookie
  reply.setCookie('jwt', token, {
    httpOnly: true,           // Не доступен для JavaScript (защита от XSS)
    secure: process.env.NODE_ENV === 'production', // Только HTTPS
    sameSite: 'Lax',          // Защита от CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    path: '/',
    domain: process.env.COOKIE_DOMAIN, // Укажите ваш домен
  });

  return reply.send({
    message: 'Logged in successfully',
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    }
  });
});
```

**Шаг 2**: Auth middleware - читать из cookie
```typescript
// backend/src/plugins/auth.ts
const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request) => {
    // ✅ Читаем токен из HttpOnly cookie (не из localStorage)
    const token = request.cookies.jwt;

    if (!token) {
      return; // Нет токена
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      (request as any).user = {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      };
    } catch (error) {
      // Токен невалидный
      logger.warn('Invalid JWT token', { error: error instanceof Error ? error.message : String(error) });
    }
  });
};
```

**Шаг 3**: Frontend - удалить localStorage
```typescript
// src/lib/authApi.ts - УДАЛИТЬ ЭТО
// localStorage.setItem('authToken', token); // ❌ УДАЛИТЬ!

// ✅ Теперь фронтенд НЕ ДОЛЖЕН хранить токен!
// Браузер автоматически отправит cookie в каждом запросе

export async function apiLogin(username: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // ✅ ВАЖНО! Отправляем cookies
    body: JSON.stringify({ username, password }),
  });

  return handleResponse(response);
}

// Удалить getAuthToken из localStorage - использовать cookies
export function getAuthHeader() {
  // ✅ Токен теперь ВСЕГДА в cookie, не нужно передавать в headers
  return {}; // Браузер автоматически отправит cookie
}
```

**Шаг 4**: Обновить все API вызовы
```typescript
// src/lib/api-client.ts
export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, data?: unknown) => request<T>('POST', path, data),
  // ...
};

async function request<T>(
  method: string,
  path: string,
  data?: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // ✅ Отправляем cookies автоматически
    body: data ? JSON.stringify(data) : undefined,
  });

  return handleResponse<T>(response);
}
```

**Миграция пользователей**:
```typescript
// Напишите скрипт для очистки старых токенов
function clearOldTokens() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
  sessionStorage.removeItem('jwt');
}

// Вызовите при загрузке
clearOldTokens();
```

---

### 3️⃣ SQL Injection в Google Books API

**Статус**: ❌ УЯЗВИМО  
**CVSS Score**: 9.8 (CRITICAL)  
**Файл**: `backend/src/modules/books/books.route.ts`

#### Проблема
```typescript
// ❌ УЯЗВИМО - пользовательский ввод без экранирования
const query = request.query.q;
const response = await fetch(
  `https://www.googleapis.com/books/v1/volumes?q=${query}`
);
```

Атаказ:
```
q=test" OR "1"="1
q=test&maxResults=999999999&orderBy=relevance
q=<script>alert('xss')</script>
```

#### Решение

```typescript
// ✅ ПРАВИЛЬНО
import { z } from 'zod';

const searchQuerySchema = z.object({
  q: z.string()
    .min(1, 'Поиск не может быть пустым')
    .max(256, 'Слишком длинный поиск')
    .trim(), // Удаляем пробелы
});

fastify.get<{ Querystring: { q: string } }>(
  '/search',
  async (request, reply) => {
    // ✅ Валидируем и санитизируем
    const { q } = searchQuerySchema.parse(request.query);

    // ✅ Экранируем для URL
    const encodedQuery = encodeURIComponent(q);

    // ✅ Добавляем белый список параметров
    const params = new URLSearchParams({
      q: encodedQuery,
      maxResults: '40', // Жесткий лимит
      fields: 'items(id,volumeInfo(title,authors,imageLinks,description))',
      key: process.env.GOOGLE_BOOKS_API_KEY!,
    });

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'BookStrata-Pro/1.0',
        },
        timeout: 10000, // 10 сек timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }

    const data = await response.json();
    
    return reply.send({
      results: (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.volumeInfo.title,
        authors: item.volumeInfo.authors || [],
        coverUrl: item.volumeInfo.imageLinks?.thumbnail || null,
        description: item.volumeInfo.description || null,
      })),
      totalItems: data.totalItems,
    });
  }
);
```

---

### 4️⃣ HTML Injection / XSS в описаниях

**Статус**: ⚠️ ЧАСТИЧНО ЗАЩИЩЕНО  
**CVSS Score**: 6.1 (MEDIUM)

#### Решение

```bash
npm install sanitize-html
```

```typescript
// backend/src/modules/books/books.route.ts
import sanitizeHtml from 'sanitize-html';

fastify.post<{ Body: CreateBookBody }>(
  '/create',
  { preHandler: [authMiddleware] },
  async (request, reply) => {
    const { title, description, thoughts } = request.body;

    // ✅ Санитизируем HTML
    const cleanDescription = sanitizeHtml(description, {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'], // Только безопасные теги
      allowedAttributes: {},
      disallowedTagsMode: 'discard',
    });

    const cleanThoughts = sanitizeHtml(thoughts, {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: {},
    });

    // Сохраняем в БД
    const book = await prisma.book.create({
      data: {
        title: title.trim(), // Trim для удаления пробелов
        description: cleanDescription,
        thoughts: cleanThoughts,
        // ...
      },
    });

    return reply.code(201).send(book);
  }
);
```

---

## ⚠️ ВЫСОКИЕ ПРИОРИТЕТЫ

### 5️⃣ Rate Limiting (Дифференцированный)

```typescript
// ✅ backend/src/server.ts
await fastify.register(rateLimit, {
  global: {
    max: 1000,
    timeWindow: '1 minute', // Глобальный лимит
  },
});

// Специфичные лимиты для критичных операций
const limits = {
  // Защита от brute-force
  auth: { max: 5, timeWindow: '5 minutes' },
  
  // Google API квота
  bookSearch: { max: 50, timeWindow: '1 hour' },
  
  // Стандартный
  tierLists: { max: 100, timeWindow: '1 minute' },
  
  // Просмотр публичного контента
  public: { max: 300, timeWindow: '1 minute' },
};

// Middleware для применения лимитов
fastify.post<{ Body: LoginPayload }>(
  '/auth/login',
  { onRequest: rateLimitMiddleware(limits.auth) },
  async (request, reply) => {
    // ...
  }
);
```

---

### 6️⃣ Input Validation везде

```typescript
// ✅ Всегда используйте Zod
import { z } from 'zod';

const updateTierListSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
});

// Применяйте в routes
fastify.put<{ Body: UpdateTierListBody }>(
  '/:id',
  { preHandler: [authMiddleware, validateBody(updateTierListSchema)] },
  async (request, reply) => {
    const validated = updateTierListSchema.parse(request.body);
    // validated.title безопасна!
  }
);
```

---

### 7️⃣ Environment Variables

**Никогда не коммитьте `.env`!**

```bash
# ✅ .env.example - коммитьте ТОЛЬКО ЭТОТ
DATABASE_URL=postgresql://user:pass@localhost/db
JWT_SECRET=your-secret-here
GOOGLE_BOOKS_API_KEY=your-key-here

# ❌ .env - НЕ коммитьте!
DATABASE_URL=postgresql://real_user:real_pass@prod.db/production
JWT_SECRET=actual-prod-secret-12345
```

Проверка:
```bash
git check-ignore .env
# Должно вывести: .env
```

---

## 🔍 SECURITY CHECKLIST

- [ ] CSRF токены для всех POST/PUT/DELETE
- [ ] JWT в HttpOnly cookies (не localStorage)
- [ ] SQL Injection защита (encodeURIComponent)
- [ ] HTML Injection защита (sanitize-html)
- [ ] Rate limiting дифференцированный
- [ ] Input validation везде (Zod)
- [ ] Content Security Policy (CSP) заголовки
- [ ] HTTPS в production
- [ ] Environment variables никогда не коммитятся
- [ ] Логирование security событий
- [ ] CORS ограничены на только разрешенные домены
- [ ] SameSite cookies включены
- [ ] Secure cookies флаг в production
- [ ] Никогда не логируйте passwords/tokens
- [ ] Регулярные Security обновления зависимостей

```bash
# Проверить уязвимые пакеты
npm audit

# Автоматически исправить
npm audit fix
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Checklist перед деплоем

```bash
# 1. Убедиться что все переменные установлены
npm run check-env

# 2. Запустить security audit
npm audit

# 3. Запустить все тесты
npm test

# 4. Build
npm run build

# 5. Проверить CSP headers
curl -I https://your-app.com | grep Content-Security-Policy

# 6. Проверить HTTPS
curl -I https://your-app.com | grep -i strict-transport-security
```

### Headers для production (`.env.production`)

```
# backend/src/server.ts
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000, // 1 год
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
```

---

## 📞 КОНТАКТЫ

Для сообщения об уязвимостях:  
📧 security@bookstrata.dev  
🔗 https://bookstrata.dev/.well-known/security.txt

---

*Руководство составлено на основе OWASP Top 10 2023*


