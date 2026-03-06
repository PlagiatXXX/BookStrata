# TierMaker Pro — Context Guide

## 📋 Project Overview

**TierMaker Pro** — полнофункциональное full-stack веб-приложение для создания и управления ранжирующими списками (tier lists) книг. Приложение позволяет пользователям создавать персональные рейтинги, организовывать книги по кастомным уровням (S, A, B, C, D), загружать обложки через drag-and-drop, и делиться своими списками.

### Ключевые возможности
- Аутентификация пользователей (JWT + bcrypt)
- Создание/редактирование/удаление tier lists
- Drag-and-drop сортировка книг между уровнями
- Загрузка обложек (локально + URL + Cloudinary)
- Поиск книг через Google Books API
- Экспорт tier list в изображение (PNG)
- Система шаблонов для быстрого создания списков
- Публичные/приватные списки с системой лайков

---

## 🏗️ Architecture

```
tiermaker-pro/
├── src/                    # Frontend (React 19 + TypeScript)
│   ├── app/                # App shell, routing
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React Context (Auth, Theme)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities, API client, logger
│   ├── pages/              # Route pages
│   │   └── TierListEditorPage/  # Tier list editor page
│   │       ├── components/ # Editor-specific components
│   │       │   ├── EditorLayout.tsx
│   │       │   ├── EditorMainContent.tsx
│   │       │   ├── EditorHeader.tsx
│   │       │   ├── EditorModals.tsx
│   │       │   ├── EditorScreens.tsx
│   │       │   └── AutoSaveIndicator.tsx
│   │       └── hooks/    # Editor-specific hooks
│   │           ├── useTierEditorState.ts
│   │           ├── useTierEditorQueries.ts
│   │           ├── useTierEditorDrag.ts
│   │           ├── useTierEditorBlocker.ts
│   │           ├── useTierEditorSave.ts
│   │           └── useTierEditorActions.ts
│   ├── state/              # State management
│   ├── types/              # TypeScript types
│   └── utils/              # Helper functions
├── backend/                # Backend (Fastify + Prisma)
│   ├── src/
│   │   ├── modules/        # Feature modules (auth, tier-lists, templates)
│   │   ├── plugins/        # Fastify plugins (cors, rate-limit, swagger)
│   │   └── server.ts       # Server entry point
│   └── prisma/
│       ├── schema.prisma   # Database schema
│       ├── migrations/     # DB migrations
│       └── seed.ts         # Seed data
└── docs/                   # Documentation
```

---

## 🚀 Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI library |
| TypeScript | 5.9 | Type safety |
| Vite | 7.2 | Build tool |
| TailwindCSS | 4.1.18 | Styling |
| React Router | 7.12.0 | Routing |
| TanStack Query | 5.90.20 | Server state |
| @dnd-kit | 6.3+ | Drag-and-drop |
| React Hot Toast | 2.6.0 | Notifications |
| Lucide React | 0.562.0 | Icons |
| React Dropzone | 14.3.8 | File uploads |
| html-to-image | 1.11.13 | Image export |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Fastify | 5.7 | Web framework |
| Prisma | 4.16.2 | ORM |
| PostgreSQL | 12+ | Database |
| JWT | 9.0.3 | Authentication |
| bcryptjs | 3.0.3 | Password hashing |
| Zod | 4.3.6 | Input validation |
| Cloudinary | 2.9.0 | Image hosting |
| @fastify/* | various | Plugins (cors, rate-limit, swagger) |

---

## 🔧 Development Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation

```bash
# 1. Clone repository
git clone https://github.com/PlagiatXXX/BookStrata.git
cd tiermaker-pro

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..

# 4. Setup environment variables
# Frontend: copy .env.example to .env.local
cp .env.example .env.local

# Backend: copy backend/.env.example to backend/.env
cp backend/.env.example backend/.env
```

### Environment Configuration

**Frontend (`.env.local`):**
```env
VITE_API_URL=http://localhost:8080
```

**Backend (`backend/.env`):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tiermaker_db"
CLIENT_URL=http://localhost:5173
PORT=8080
NODE_ENV="development"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
GOOGLE_BOOKS_API_KEY="your-google-books-api-key"
```

### Database Setup

```bash
cd backend
npx prisma migrate dev
npx prisma db seed    # Optional: seed initial data
```

### Running the Application

**Terminal 1 — Frontend:**
```bash
npm run dev
# Available at: http://localhost:5173
```

**Terminal 2 — Backend:**
```bash
cd backend
npm run dev
# API available at: http://localhost:8080
```

---

## 📦 Available Scripts

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Vite) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests (Vitest) |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Run tests with coverage |

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (tsx watch) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run migrate` | Run Prisma migrations |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run test` | Run tests (Vitest) |

---

## 🗄️ Database Schema

### Core Models

**User**
- `id`, `email`, `username`, `avatarUrl`, `passwordHash`
- `aiAvatarsGenerated`, `lastAvatarResetAt`
- Relations: `tierLists`, `templates`, `tierListLikes`, `templateLikes`

**TierList**
- `id`, `userId`, `title`, `year`, `isTemplate`, `isPublic`
- Relations: `user`, `tiers`, `placements`, `likes`

**Tier**
- `id`, `tierListId`, `title`, `color`, `rank`
- Index: `[tierListId, rank]`

**Book**
- `id`, `title`, `author`, `coverImageUrl`, `description`, `thoughts`
- Relations: `placements`

**BookPlacement**
- Composite ID: `[tierListId, bookId]`
- `tierId`, `rank`
- Index: `[tierId, rank]`

**Template**
- `id` (UUID), `title`, `description`, `tiers` (JSON), `defaultBooks` (JSON)
- `authorId`, `isPublic`
- Relations: `author`, `likes`

**TierListLike / TemplateLike**
- Unique constraint: `[userId, tierListId/templateId]`

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout user |

### Tier Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tier-lists` | Get user's tier lists |
| POST | `/api/tier-lists` | Create new tier list |
| GET | `/api/tier-lists/:id` | Get tier list by ID |
| PUT | `/api/tier-lists/:id` | Update tier list |
| DELETE | `/api/tier-lists/:id` | Delete tier list |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | Get all templates |
| POST | `/api/templates` | Create template |
| GET | `/api/templates/:id` | Get template by ID |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |

---

## 🧩 Key Frontend Components

### Core Components
| Component | Path | Purpose |
|-----------|------|---------|
| `AuthForm` | `src/components/AuthForm/` | Login/Register form |
| `TierGrid` | `src/components/TierGrid/` | Main tier list grid |
| `TierRow` | `src/components/TierRow/` | Single tier row |
| `SortableBookCover` | `src/components/SortableBookCover/` | Draggable book cover |
| `BookEditModal` | `src/components/BookEditModal/` | Edit book details |
| `BookViewModal` | `src/components/BookViewModal/` | View book details |
| `BookSearchModal` | `src/components/BookSearchModal/` | Search books (Google Books) |
| `ImageUploader` | `src/components/ImageUploader/` | Image upload component |
| `SettingsSidebar` | `src/components/SettingsSidebar/` | Settings panel |
| `UnrankedItems` | `src/components/UnrankedItems/` | Unranked books panel |

### Template Components
| Component | Path | Purpose |
|-----------|------|---------|
| `TemplateBuilder` | `src/components/TemplateBuilder/` | Build templates |
| `TemplateCard` | `src/components/TemplateCard/` | Template display card |
| `TemplateLibrary` | `src/components/TemplateLibrary/` | Browse templates |
| `TemplateSelector` | `src/components/TemplateSelector/` | Select template for tier list |

### Contexts
| Context | Path | Purpose |
|---------|------|---------|
| `AuthContext` | `src/contexts/AuthContext.tsx` | User authentication state |
| `ThemeProvider` | `src/contexts/ThemeProvider.tsx` | Theme (light/dark) state |

---

## 🎨 Styling & Theming

- **TailwindCSS 4** — utility-first CSS framework
- **Color constants** — `src/constants/colors.ts`
- **Responsive design** — mobile-first approach

### Theme Customization
```typescript
// src/contexts/ThemeProvider.tsx
// Global theme configuration
```

---

## 🧪 Testing

### Frontend Testing (Vitest + React Testing Library)
```bash
npm run test          # Run tests
npm run test:ui       # Run with UI
npm run test:coverage # Run with coverage report
```

### Backend Testing (Vitest)
```bash
cd backend
npm run test
npm run test:ui
```

### Test File Convention
- Test files located alongside source files: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
- Frontend tests: `src/test/setup.ts` setup with happy-dom
- Test files use `/// <reference types="vitest/globals" />` for globals
- All new hooks must have corresponding `.spec.tsx` test files

### Test Coverage Summary (as of March 2026)
| Location | Tests | Status |
|----------|-------|--------|
| `src/hooks/` | 30 | ✅ |
| `src/pages/TierListEditorPage/hooks/` | 68 | ✅ |
| `src/lib/` | 3 | ✅ |
| `src/utils/` | 17 | ✅ |
| `src/ui/` | 7 | ✅ |
| **Total** | **125** | ✅ |

---

## 📝 Development Conventions

### Code Style
- **TypeScript** — strict mode enabled
- **ESLint** — configured with `eslint.config.js`
- **Prettier** — not explicitly configured, follows ESLint

### Git Workflow
- Feature branches: `feature/<name>`
- Bug fixes: `fix/<name>`
- Commits follow conventional commits pattern

### File Naming
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Constants: `constants/<name>.ts`
- Types: `types/<name>.ts`

### Import Aliases
```typescript
import { Component } from '@/components/Component'
import { hook } from '@/hooks/hook'
import { utils } from '@/utils/utils'
```

---

## 🐛 Known Issues & TODOs

See the following files for improvement recommendations:
- `ROADMAP.md` — detailed development roadmap (5 phases)
- `TierMaker-Pro-Business-Plan.txt` — business strategy
- `docs/AVATAR_FEATURE_SPEC.md` — avatar feature specification

### Current Phase: PHASE 2 (Refactoring & Testing) ✅ COMPLETED

#### Phase 1 (Foundation) — Completed
- [x] Environment variables setup
- [x] Input validation (Zod)
- [x] Error handling
- [x] Logger utility
- [x] Rate limiting
- [x] CORS security
- [x] First unit tests
- [x] API documentation (Swagger)

#### Phase 2 (Refactoring & Testing) — Completed
- [x] TierListEditorPage refactoring (533 → 332 lines, -38%)
- [x] Created 5 custom hooks for editor logic
- [x] Created 6 reusable components
- [x] Added 82 unit tests for hooks
- [x] Total test coverage: 125 tests passing
- [x] **AvatarSelector refactoring** (462 → 256 lines, -44%)

##### New Hooks (src/pages/TierListEditorPage/hooks/)
| Hook | Purpose | Tests |
|------|---------|-------|
| `useTierEditorState` | 14 useState states management | 19 |
| `useTierEditorQueries` | 3 useQuery data fetching | 11 |
| `useTierEditorDrag` | Drag-and-drop logic | 12 |
| `useTierEditorBlocker` | Navigation blocking & beforeunload | 7 |
| `useTierEditorSave` | Auto-save optimization | 19 |

##### New Components (src/pages/TierListEditorPage/components/)
| Component | Purpose |
|-----------|---------|
| `EditorLayout` | D&D container + layout wrapper |
| `EditorMainContent` | Tier grid + unranked + sidebar |
| `EditorHeader` | Title + auto-save indicator |
| `EditorModals` | All modal dialogs |
| `EditorScreens` | Loading/error state screens |
| `AutoSaveIndicator` | Save status indicator |

##### New Components (src/components/Avatar/components/)
| Component | Purpose |
|-----------|---------|
| `AvatarSelectorHeader` | Modal header + close button |
| `AvatarPreview` | Avatar preview with loading state |
| `TabNavigation` | Tab switcher (Presets/AI/Upload) |
| `PresetsTab` | Preset categories + grid |
| `AiGenerationTab` | AI generation form + limits |
| `UploadTab` | File upload component |
| `AvatarSelectorFooter` | Save/Cancel actions |

##### New Hooks (src/components/Avatar/hooks/)
| Hook | Purpose |
|------|---------|
| `useAvatarPreview` | Preview image polling logic |
| `useAvatarGeneration` | AI generation + timeout handling |

##### Test Coverage
```
Test Files: 11 passed (11)
Tests: 125 passed (125)
Duration: ~24s
```

---

## 📚 Additional Documentation

| File | Description |
|------|-------------|
| `README.md` | Main project documentation |
| `ROADMAP.md` | 5-phase development roadmap |
| `TierMaker-Pro-Business-Plan.txt` | Business plan for monetization |
| `docs/AVATAR_FEATURE_SPEC.md` | Avatar feature specification |

---

## 🔐 Security Notes

- **JWT Secret** — must be changed in production
- **Environment files** — `.env` and `.env.local` are gitignored
- **Password hashing** — bcryptjs with salt rounds
- **CORS** — configured for specific client URL
- **Rate limiting** — available via `@fastify/rate-limit`

---

## 🚀 Deployment Checklist

### Pre-launch
- [ ] All environment variables configured
- [ ] Error logging enabled
- [ ] Rate limiting activated
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Database backups working
- [ ] Monitoring setup
- [ ] Security audit passed

### Production Build
```bash
# Frontend
npm run build
npm run preview

# Backend
cd backend
npm run build
npm run start
```

---

## 📞 Quick Reference

| Service | Local URL | Purpose |
|---------|-----------|---------|
| Frontend | `http://localhost:5173` | React app |
| Backend API | `http://localhost:8080` | Fastify API |
| Swagger UI | `http://localhost:8080/docs` | API documentation |
| PostgreSQL | `localhost:5432` | Database |

---

**Last Updated**: 6 марта 2026 г.
**Project Status**: Active Development (Phase 2 Completed ✅, Phase 3 In Progress)
