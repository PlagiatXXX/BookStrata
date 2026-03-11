# BookStrata Pro 🎯

**Full-stack web application for creating and managing ranked tier lists with Telegram error monitoring.**

[![Built with pollinations.ai](https://img.shields.io/badge/Built%20with-Pollinations-8a2be2?style=for-the-badge&logo=data:image/png;base64,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&logoColor=white&labelColor=6a0dad)](https://pollinations.ai)
[![React](https://img.shields.io/badge/React-19.2.0-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-5.7-000000?logo=fastify)](https://www.fastify.io)
[![Dashboard](https://img.shields.io/badge/Dashboard-Enhanced-brightgreen?style=flat)](./doctor.md)

---

## 📋 Overview

BookStrata Pro allows users to create personalized tier lists by organizing books into custom levels (S, A, B, C, D). Features include drag-and-drop sorting, advanced filtering and sorting, Telegram error notifications, and export to PNG images.

---

## ✨ Features

### Core Features
- 🎨 **Drag-and-Drop Editor** — Sort books between tiers with intuitive D&D interface
- 📚 **Book Search** — Search books via Google Books API
- 🖼️ **Image Upload** — Upload covers locally, via URL, or Cloudinary
- 📤 **Export to PNG** — Share your tier lists as images
- 🎭 **Template System** — Create and use templates for quick list creation
- 👍 **Like System** — Like and discover public tier lists
- 🌓 **Dark/Light Theme** — Toggle between themes

### Dashboard Features (Март 2026)
- 🔀 **Advanced Sorting** — 4 options: newest, oldest, title (A-Z), popularity (likes)
- 🏷️ **Smart Filtering** — 3 options: all, public, private
- 🔍 **Combined Search** — Search + filter + sort working together
- 🎨 **Styled UI** — Custom gradient buttons and select controls

### Error Monitoring (Март 2026)
- 📡 **Telegram Notifications** — Instant error alerts to developer
- 📝 **File Logging** — JSON format logs in production
- ⏱️ **Throttling** — Max 1 notification per 5 seconds
- 🔧 **Easy Setup** — 5 minute configuration

### AI Features (powered by pollinations.ai)
- 🤖 **AI Avatar Generation** — Generate custom avatars from text prompts
- 🎨 **6 Avatar Categories** — Cartoon, Fantasy, Professional, Minimalist, Animals, Abstract
- 📊 **Daily Limits** — 10 free AI generations per day per user
- ⏱️ **Async Polling** — Automatic polling until avatar is ready (~30-40 seconds)
- 💾 **Avatar Cache** — Cached for 30 days to reduce API calls

---

## 🛠️ Tech Stack

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

### AI
| Service | Purpose |
|---------|---------|
| [pollinations.ai](https://pollinations.ai) | AI avatar generation (Flux model) |
| Google Books API | Book search |

---

## 🚀 Quick Start

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
npx prisma db seed
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
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests (Vitest) |

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run migrate` | Run Prisma migrations |
| `npm run test` | Run tests |

---

## 🗄️ Database Schema

### Core Models

**User** — `id`, `email`, `username`, `avatarUrl`, `passwordHash`

**TierList** — `id`, `userId`, `title`, `year`, `isTemplate`, `isPublic`

**Tier** — `id`, `tierListId`, `title`, `color`, `rank`

**Book** — `id`, `title`, `author`, `coverImageUrl`, `description`

**BookPlacement** — Composite ID: `[tierListId, bookId]`, `tierId`, `rank`

**Template** — `id` (UUID), `title`, `description`, `tiers` (JSON), `defaultBooks` (JSON)

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

### Avatars (pollinations.ai)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/avatars/generate` | Generate AI avatar |
| GET | `/api/avatars/limit` | Get daily limit info |

---

## 🧪 Testing

```bash
# Frontend tests
npm run test

# Backend tests
cd backend && npm run test

# Test coverage
npm run test:coverage
```

**Test Coverage:** 250+ tests passing ✅

---

## 📸 Screenshots

> Add your screenshots here:
> 
> ```markdown
> ![Dashboard](./docs/screenshots/dashboard.png)
> ![Tier Editor](./docs/screenshots/tier-editor.png)
> ![AI Avatar Generation](./docs/screenshots/ai-avatar.png)
> ```

---

## 🏆 Credits

- **AI Avatar Generation** — [pollinations.ai](https://pollinations.ai)
- **Icons** — [Lucide](https://lucide.dev)
- **UI Components** — Custom with TailwindCSS

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Contact

- **GitHub**: [@PlagiatXXX](https://github.com/PlagiatXXX)
- **Project**: [BookStrata](https://github.com/PlagiatXXX/BookStrata)

