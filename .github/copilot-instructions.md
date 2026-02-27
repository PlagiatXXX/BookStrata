# AI Agent Coding Instructions for TierMaker Pro

## Project Overview
**TierMaker Pro** is a full-stack web application for creating and managing tier lists of books. It combines:
- **Frontend**: React 19 + TypeScript + Vite + @dnd-kit for drag-and-drop
- **Backend**: Fastify 5 + Prisma 4 + PostgreSQL  
- **Authentication**: JWT + bcryptjs
- **Styling**: TailwindCSS 4

## Architecture Essentials

### Core Data Model (Prisma)
The application centers on three key entities:
- **User**: Authentication, profile with avatar tracking
- **TierList**: User's ranked lists with title, tiers, and book placements
- **Book**: Items being ranked with cover images (stored on Cloudinary)
- **Template**: Reusable tier structures that users can instantiate

**Key relationships**:
- Cascading deletes: Removing a TierList cascades to its Tiers and BookPlacements
- BookPlacement is a composite key (tierListId + bookId) representing rank and tier assignment
- Templates can have default books and tier configurations

### Frontend State Architecture
1. **TierListData Interface** (`src/types/index.ts`):
   ```typescript
   {
     id: string;
     title: string;
     books: Record<string, Book>;
     tiers: Record<string, Tier>;
     tierOrder: string[];  // Ordered tier IDs for rendering
     unrankedBookIds: string[];  // Books not yet placed
     tierIdToTempIdMap: Record<string, string>;  // Temp↔Real ID mapping
   }
   ```
   This structure uses **record/map patterns** instead of arrays for O(1) lookups.

2. **State Management**: 
   - **useTierList.ts**: Core reducer with actions for drag-drop, tier CRUD, book management
   - **useTierState.ts**: History wrapper with undo/redo using past/present/future pattern
   - **useAutoSaveOptimized.ts**: Debounced saves sending only delta changes (diffs) to backend

3. **Temporary IDs**: Before saving, tiers and books use UUIDs. After server confirmation, these are replaced with DB IDs via `REPLACE_TIER_IDS` and `REPLACE_BOOK_IDS` actions.

### Backend Route Organization
Routes are organized by feature modules in `backend/src/modules/`:
- **auth/**: JWT validation, token refresh, password hashing
- **tier-lists/**: CRUD for tier lists with computed likes, filtering by public/user
- **books/**: Search, upload via Cloudinary, metadata management
- **templates/**: Public template library, user's private templates
- **users/**: Profile, avatar generation via AI
- **avatars/**: AI avatar generation (tracks quota per user)

Each module follows: `.route.ts` → `.service.ts` + `.schema.ts` (Zod validation).

## Critical Developer Workflows

### Running the Application
```powershell
# Terminal 1: Backend (watches for changes)
cd backend
npm run dev

# Terminal 2: Frontend (Vite dev server with proxy)
npm run dev
# Proxy at /api → http://localhost:8080 (see vite.config.ts)
```

### Database Setup
```powershell
# Initial setup (creates DB and runs migrations)
cd backend
npm install
prisma migrate dev --name initial_schema

# After schema.prisma changes
prisma migrate dev --name <descriptive_name>

# Reset database (dev only!)
prisma migrate reset --force

# View data in UI
prisma studio
```

### Testing
```powershell
# Frontend tests (Vitest + happy-dom)
npm run test
npm run test:ui

# Backend tests  
cd backend
npm run test

# Coverage reports
npm run test:coverage
```

### Build & Deployment
```powershell
# Frontend: TypeScript check → Vite build
npm run build

# Backend: TypeScript check → compile to dist/
cd backend
npm run build

# Run backend from compiled JS
npm start
```

## Critical Patterns & Conventions

### Drag-and-Drop Workflow
The app uses **@dnd-kit** with specific patterns in `src/constants/dnd.ts`:
- `UNRANKED_AREA_ID = 'unranked'` is a virtual container ID
- Reordering within same container: Use `arrayMove()` from @dnd-kit/sortable
- Cross-container moves: Manually track item removal and insertion with indices
- **DragEndEvent** is processed in reducer to update state immediately (optimistic)

### Auto-Save Pattern
`useAutoSaveOptimized` implements **delta-based saving**:
- `getSavePayload()` returns **only changed data** (not full state)
- Debounces requests by 2000ms
- Retries up to 3 times on failure
- Tracks `hasPendingChanges` boolean for UI feedback
- Replaces temp IDs with real IDs after server response

**Save payload structure** (from `useAutoSaveOptimized.ts`):
```typescript
{
  placements?: { bookId: number; tierId: number | null; rank: number }[];
  tiers?: (added/updated arrays + deletedIds) | array format;
  newBooks?: Array<Book creation data>;
}
```

### Authentication Flow
1. **Login/Register**: User provides email+password → backend hashes with bcryptjs → returns JWT
2. **Token Storage**: `localStorage.getItem('auth_token')` in `src/lib/authApi.ts`
3. **Auto-Validation**: `AuthContext` validates stored token on app load via `/api/auth/validate`
4. **Protected Routes**: `ProtectedRoute` component checks `useAuthContext()` and redirects to `/auth` if null

**API calls automatically include token**:
```typescript
// In getAuthHeader() from authApi.ts
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Book Image Handling
- **Frontend**: `react-dropzone` for uploads, `ImageUploader` component
- **Backend**: Cloudinary integration (`backend/src/lib/cloudinary.js`)
- Images uploaded as base64 or URLs → stored as `coverImageUrl` in DB
- No local image storage (all cloud-hosted)

### Logging Strategy
- **Frontend**: `src/lib/logger.ts` wraps console with structured logging (labels, severity)
- **Backend**: Fastify built-in logger with pino-pretty for dev mode
- **Error handling**: Catch blocks log with context, re-throw or send HTTP error responses
- **No console.log in production**: Use logger utilities instead

## Project-Specific Conventions

### Type Safety
- All API responses have dedicated types in `src/types/api.ts`
- Prisma auto-generates types from schema.prisma
- Use `Record<string, T>` for maps (not `Map<>`) for JSON serializability
- Discriminated unions for action types in reducers

### Error Handling
- **Frontend**: toast notifications via `react-hot-toast` for user feedback
- **Backend**: Fastify reply.code(statusCode).send(error) or throw custom FastifyError
- Validation: Zod schema parsing in routes, validation errors return 400 with details

### Styling
- **TailwindCSS 4** with custom theme extensions in `tailwind.config.ts`
- Y2K aesthetic: Cyan/fuchsia colors, custom panel styling
- Component-level: Use className strings, not CSS modules
- Responsive: Mobile-first with `md:`, `lg:` prefixes

### File Organization
- **src/components/**: Reusable UI (TierRow, BookCover, modals)
- **src/pages/**: Full page components with layout
- **src/hooks/**: Custom React hooks (state, data fetching, side effects)
- **src/lib/**: Utilities (API client, logger, storage helpers)
- **src/types/**: TypeScript interfaces and type definitions
- **backend/src/modules/**: Feature modules, each with route/service/schema

## Integration Points & External Dependencies

### Fastify Plugins (Backend)
Loaded in `server.ts`:
- `@fastify/cors`: CORS configuration for `CLIENT_URL` env var
- `@fastify/rate-limit`: Throttle requests (prevents abuse)
- `@fastify/swagger` + `@fastify/swagger-ui`: Auto-generate OpenAPI docs
- `requestContext`: Custom plugin for request ID tracking
- `logFromFrontend`: Receives frontend logs and centralizes them

### Env Variables
**Frontend** (`.env.local`):
```
VITE_API_URL=http://localhost:8080
```

**Backend** (`.env`):
```
DATABASE_URL=postgresql://...
JWT_SECRET=<random_string>
CLIENT_URL=http://localhost:5173
NODE_ENV=development
PORT=8080
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### React Query Integration
- Queries cached by default (5-min staleness)
- Used for user data, tier lists, templates
- Mutations for create/update operations
- Prefetching for templates library

## Common Tasks & Code Patterns

### Adding a New Tier List Property
1. Add field to `schema.prisma` → `TierList` model
2. Create migration: `prisma migrate dev --name add_<field>`
3. Update `ApiTierListResponse` type in `src/types/api.ts`
4. Update reducer actions if client-side state affected
5. Update backend service to include field in responses

### Adding a New API Endpoint
1. Create handler in `backend/src/modules/<feature>/<feature>.route.ts`
2. Define Zod schema in `.schema.ts` for request/response validation
3. Implement logic in `.service.ts`
4. Export route function and register in `server.ts`
5. Add client-side function in corresponding `src/lib/*Api.ts`

### Debugging Auto-Save Issues
- Check `useAutoSaveOptimized` hook's `getSavePayload()` returns correct diff
- Verify backend endpoint accepts the payload shape
- Check `hasPendingChanges` boolean in component
- Review retry logic if 3 retries fail (logs stored in component state)

## Testing Conventions

### Frontend (Vitest + React Testing Library)
- Test files: `*.spec.tsx` alongside components
- Setup in `src/test/setup.ts` (configures testing library)
- Use happy-dom environment (lighter than jsdom)
- Example: `useTierList.spec.ts` for reducer logic

### Backend (Vitest)
- Test files in same directory as implementation
- Mock Prisma client for unit tests
- Test route validation with invalid schemas
- Use `prisma:seed` for test data setup

## Key Files Reference
- **Frontend routing**: `src/app/router.tsx` (all protected routes defined here)
- **Core state machine**: `src/hooks/useTierList.ts` (350+ lines, handles all mutations)
- **Auto-save logic**: `src/hooks/useAutoSaveOptimized.ts` (delta-based saving with retry)
- **Backend entry**: `backend/src/server.ts` (plugin registration, CORS setup)
- **Database schema**: `backend/prisma/schema.prisma` (source of truth for data model)
- **API types**: `src/types/api.ts` (contracts between frontend and backend)

---

**Last Updated**: Feb 26, 2026  
**Project Version**: React 19 + Fastify 5 + Prisma 4
