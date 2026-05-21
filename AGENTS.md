# AGENTS.md — BookStrata Pro

## Project Structure

Two independent npm workspaces (no monorepo tool):
- **Root** — React 19 + Vite 7 + TypeScript 5.9 + TailwindCSS 4 frontend on `:5173`
- **`backend/`** — Fastify 5.7 + Prisma 4.16 + Zod backend on `:8080`
- **`shared/types.ts`** — types used by both sides

## Developer Commands

```bash
# Install deps (run in BOTH directories, separately)
npm install          # root
cd backend && npm install

# Dev servers (need TWO terminals)
npm run dev          # frontend :5173
cd backend && npm run dev   # backend :8080 (tsx watch)

# Typecheck + build
npm run build        # frontend: tsc -b && vite build
cd backend && npm run build # prisma generate && tsc

# Lint (root only, covers both via globalIgnores)
npm run lint

# Tests
npm test             # frontend vitest (happy-dom, watch mode)
cd backend && npm test      # backend vitest (node env)
npm run test:coverage
npm run test:ui
```

**Required env vars for backend startup:** `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` — server exits if any missing.

## Database & Infra

```bash
cd backend
npx prisma migrate dev      # create + apply migration
npx prisma db seed          # seed data (prisma/seed.ts via ts-node)
npx prisma generate         # regenerate client (auto-runs in build)

# Redis (optional — app works without it, caching is skipped)
docker compose up -d        # from backend/
```

PostgreSQL 14+ required. Redis via `backend/docker-compose.yml`.

## Architecture Notes

**Frontend (`src/`):**
- `@/` alias → `src/` (vite.config.ts + tsconfig.app.json)
- `app/router.tsx` — React Router setup
- `hooks/useTierList.ts` — redux-like reducer for tier editor (~15 action types), optimistic updates, ~2s debounce autosave
- `contexts/AuthContext.tsx` — JWT in localStorage, Bearer header, auto-refresh on 401
- `lib/api-client.ts` — HTTP client: auto-unwrap `{ data: ... }`, normalize errors, 401 → refresh token + retry once, auto-check achievements in responses
- Vite proxies `/api` → `http://localhost:8080`
- Uses `babel-plugin-react-compiler` (enforced by eslint-plugin-react-compiler as error)

**Backend (`backend/src/`):**
- `@/` alias → `src/` (backend tsconfig.json)
- Module pattern: `modules/{feature}/{feature}.route.ts`, `.service.ts`, `.schema.ts`
- 11 modules: auth, users, avatars, books, tier-lists, news, roles, subscriptions, achievements, battles, templates
- `server.ts` — all route registration, plugins (auth, request-context, log-from-frontend, error-notifier)
- Swagger UI at `/documentation` when running
- `bodyLimit: 10MB` (for base64 image uploads)
- Prisma client decorated on fastify instance: `fastify.prisma`
- Error notifier sends critical errors to Telegram (configurable)

## Testing

- **Frontend:** Vitest + happy-dom + React Testing Library. Setup: `src/test/setup.ts` (mocks `matchMedia`). Pool: `forks`.
- **Backend:** Vitest + node env + Supertest. Setup: `backend/vitest.setup.ts`.
- Test file patterns: `src/**/*.{test,spec}.{ts,tsx}` (frontend), `backend/src/**/*.{test,spec}.ts` (backend)
- ESLint relaxes `@typescript-eslint/no-explicit-any` in test files

## Conventions

- Strict TypeScript on both sides
- Kebab-case filenames, CamelCase exports
- Zod schemas for all API input validation (backend)
- Services contain business logic; routes are thin controllers
- Frontend API clients in `src/lib/{domain}Api.ts` using `apiClient`

## API Standards (2025-05-19)

### Error Response Format

```typescript
// Все ошибки возвращаются в формате:
{ error: { code: string, message: string, details?: unknown } }
```

См. `backend/src/lib/api-response.ts` — ErrorCodes enum + createApiError helper.

### Error Codes

| Code | HTTP Status | Описание |
|------|-------------|----------|
| validation_error | 400 | Ошибка валидации запроса |
| invalid_input | 400 | Невалидные входные данные |
| unauthorized | 401 | Требуется авторизация |
| token_invalid | 401 | JWT токен невалиден |
| refresh_token_expired | 401 | Refresh токен истёк |
| forbidden | 403 | Нет прав доступа |
| access_denied | 403 | Доступ запрещён |
| not_found | 404 | Ресурс не найден |
| conflict | 409 | Конфликт (дубликат) |
| rate_limit_exceeded | 429 | Превышен лимит запросов |
| internal_error | 500 | Серверная ошибка |

### Pagination Response Format

```typescript
// Все list endpoints возвращают:
{
  data: [...],
  meta: { totalItems, totalPages, currentPage, itemCount, itemsPerPage },
  links: { self, next?, prev?, last }
}
```

См. `backend/src/lib/api-response.ts` — createSuccessResponse.

### REST Conventions

- 201 Created всегда возвращает `Location` header
- GET для чтения, POST для создания, PUT/PATCH для обновления, DELETE для удаления
- Использовать plural nouns в URL: `/api/tier-lists` не `/api/tierlist`
- kebab-case для URL параметров: `/api/team-members`

### Swagger Documentation

Документация доступна по `/documentation` при запущенном сервере.
Описание API включает таблицу error codes и примеры pagination.

### Response Envelope

Все endpoints используют `{ data: ... }` envelope:
```typescript
// Простой ответ
{ data: [...] }

// Сложный ответ с meta
{ data: { success, ... }, meta?: {...} }

// Пагинированный ответ
{ data: [...], meta: {...}, links: {...} }
```

**Важно:** `apiClient` (`lib/api-client.ts`) auto-unwraps `.data` для non-paginated responses.
Для paginated responses (с meta/links) — возвращает объект целиком.

### Rate Limiting

Redis-backed rate limiting (fallback на in-memory при недоступности Redis) с `@fastify/rate-limit`.

Store: `backend/src/lib/redis.ts` — `RedisRateLimitStore` (кастомный, с LUA-free increment'ом через ioredis).

**Глобальные лимиты:**
| Тип | Лимит | Window | Ключ |
|-----|-------|--------|------|
| Анонимные | 30 req/min | 1 min | `ip:{ip}` |
| Авторизованные | 200 req/min | 1 min | `user:{userId}` |

**Per-route лимиты:**
| Эндпоинт | Лимит | Window |
|----------|-------|--------|
| POST /api/auth/register | 10 | 1 hour |
| POST /api/auth/login | 20 | 1 min |
| POST /api/auth/forgot-password | 5 | 1 hour |
| POST /api/auth/reset-password | 5 | 1 hour |
| POST /api/tier-lists | 10 | 1 hour |
| POST /api/tier-lists/:id/like | 100 | 1 min |
| DELETE /api/tier-lists/:id/like | 100 | 1 min |
| POST /api/battles | 10 | 1 hour |
| POST /api/battles/:id/vote | 30 | 1 min |

**Headers:**
- `x-ratelimit-limit` — общий лимит
- `x-ratelimit-remaining` — оставшиеся запросы
- `x-ratelimit-reset` — когда лимит сбросится (timestamp)
- `retry-after` — только при 429 (секунды до retry)

**Error response при 429:**
```json
{ "error": { "code": "rate_limit_exceeded", "message": "Слишком много запросов, попробуйте позже." } }
```

## Gotchas

- `npm install` must be run separately in root AND `backend/` — no workspace root install
- Backend `build` runs `prisma generate` before `tsc` — do not skip
- Temp UUIDs on frontend for new books/tiers get mapped to real integer IDs via `REPLACE_BOOK_IDS` action after save
- Cascade delete on TierList removes all Tiers and BookPlacements — verify ownership first
- Google Books API has ~1000 req/day quota — requests go through backend proxy with caching
- `noUnusedLocals` and `noUnusedParameters` are explicitly **disabled** in frontend tsconfig

## Role

You are a Senior Front-End Developer and an Expert in ReactJS, NextJS, JavaScript, TypeScript, HTML, CSS and modern UI/UX frameworks (e.g., TailwindCSS, Shadcn, Radix). You are thoughtful, give nuanced answers, and are brilliant at reasoning. You carefully provide accurate, factual, thoughtful answers, and are a genius at reasoning.

## Coding Environment

The user asks questions about the following coding languages:
- ReactJS
- NextJS
- JavaScript
- TypeScript
- TailwindCSS
- HTML
- CSS

## Code Implementation Guidelines

- Follow the user's requirements carefully & to the letter.
- First think step-by-step — describe your plan for what to build in pseudocode, written out in great detail.
- Confirm, then write code!
- Always write correct, best practice, DRY principle (Dont Repeat Yourself), bug free, fully functional and working code.
- Focus on easy and readability code, over being performant.
- Fully implement all requested functionality.
- Leave NO todo's, placeholders or missing pieces.
- Ensure code is complete! Verify thoroughly finalised.
- Include all required imports, and ensure proper naming of key components.
- Be concise. Minimize any other prose.
- If you think there might not be a correct answer, you say so.
- If you do not know the answer, say so, instead of guessing.
- Use early returns whenever possible to make the code more readable.
- Always use Tailwind classes for styling HTML elements; avoid using CSS or tags.
- Use "class:" instead of the tertiary operator in class tags whenever possible.
- Use descriptive variable and function/const names. Event functions should be named with a "handle" prefix, like "handleClick" for onClick and "handleKeyDown" for onKeyDown.
- Implement accessibility features on elements. For example, a tag should have a tabindex="0", aria-label, on:click, and on:keydown, and similar attributes.
- Use consts instead of functions, for example, "const toggle = () =>". Also, define a type if possible.
- Don't use semicolons.

## Commit Conventions

- The commit contains the following structural elements, to communicate intent to the consumers of your library:
  - `fix:` — a commit of the type `fix` patches a bug in your codebase (this correlates with PATCH in semantic versioning).
  - `feat:` — a commit of the type `feat` introduces a new feature to the codebase (this correlates with MINOR in semantic versioning).
  - Others: commit types other than `fix:` and `feat:` are allowed, for example `chore:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, and others.
  - A scope may be provided to a commit's type, to provide additional contextual information and is contained within parenthesis, e.g., `feat(parser): add ability to parse arrays`.
- Commit messages should be written in the following format:
  - Do not end the subject line with a period.
  - Use the imperative mood in the subject line.
  - Use the body to explain what and why you have done something. In most cases, you can leave out details about how a change has been made.
  - The commit message should be structured as follows: `<type>[optional scope]: <description>`

## Skills (OpenCode)

Skills located in `.opencode/skills/`:
- `api-design/` — REST API design patterns (resource naming, status codes, pagination, error responses)
- `docker-patterns/` — Docker and Docker Compose best practices
- `skill-creator/` — Tool for creating new skills (in `~/.config/opencode/skills/`)

Hybrid skill architecture:
- Skills use single SKILL.md with evals/ directory
- references/, scripts/, templates/ are optional (for larger skills)
- See skill-specific evals for testing patterns

See `.opencode/skills/*/evals/evals.json` for eval tests.
