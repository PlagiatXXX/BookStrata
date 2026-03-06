# BookStrata Pro 🎯

**Full-stack web application for creating and managing ranked tier lists of books with AI-generated avatars.**

[![Built with pollinations.ai](https://pollinations.ai/badge.svg)](https://pollinations.ai)
[![React](https://img.shields.io/badge/React-19.2.0-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-5.7-000000?logo=fastify)](https://www.fastify.io)

---

## 📋 Overview

BookStrata Pro allows users to create personalized tier lists by organizing books into custom levels (S, A, B, C, D). Features include drag-and-drop sorting, AI avatar generation, book search via Google Books API, and export to PNG images.

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
cd BookStrata

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

---

<p align="center">
  <a href="https://pollinations.ai">
    <img src="https://pollinations.ai/logo-white.svg" alt="Built with pollinations.ai" height="40">
  </a>
</p>
