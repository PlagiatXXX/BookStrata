import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";

const mockFindMany = vi.fn();
const mockDnaFindUnique = vi.fn();

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    book: { findMany: mockFindMany },
    readingDna: { findUnique: mockDnaFindUnique },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

let mockUser: { userId: number } | undefined = undefined;

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((req: any, _reply: any, done: any) => {
    if (mockUser) req.user = mockUser;
    done();
  }),
}));

const PROFILE = {
  storyFocus: 20,
  emotionalWeight: 30,
  pace: 80,
  darkness: 90,
  confidence: { storyFocus: 0.9, emotionalWeight: 0.9, pace: 0.9, darkness: 0.9 },
  source: "ai",
};

function bookRow(id: number, slug: string, title: string, darkness: number) {
  return {
    id,
    slug,
    title,
    author: "Автор",
    coverImageUrl: `/c/${slug}.jpg`,
    genre: slug === "dark-book" ? "Ужасы" : "Фэнтези",
    tags: [],
    readingProfile: { ...PROFILE, darkness },
  };
}

describe("GET /api/books/match", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    // Эмулируем preHandler декоратор user из authMiddleware
    instance.addHook("preHandler", async (req: any) => {
      if (mockUser) req.user = mockUser;
    });
    const { booksRoutes } = await import("./books.route.js");
    await instance.register(booksRoutes, { prefix: "/api/books" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUser = undefined;
    mockFindMany.mockResolvedValue([
      bookRow(1, "dark-book", "Тёмная", 90),
      bookRow(2, "light-book", "Светлая", 10),
    ] as any);
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("отдаёт топ-N книг с score, отсортированный по убыванию", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/books/match?darkness=90&limit=2",
    });
    expect(res.statusCode).toBe(200);
    const books = res.json().data.books;
    expect(books).toHaveLength(2);
    expect(books[0].slug).toBe("dark-book");
    expect(books[0].score).toBeGreaterThan(books[1].score);
    expect(books[0]).toHaveProperty("coverImageUrl");
    expect(books[0]).toHaveProperty("author");
  });

  it("400, если ни одна ось не задана и пользователь без ДНК", async () => {
    mockDnaFindUnique.mockResolvedValue(null);
    const res = await app.inject({
      method: "GET",
      url: "/api/books/match",
    });
    expect(res.statusCode).toBe(400);
  });

  it("без осей в query, но авторизованный пользователь с ДНК → 200 с книгами по ДНК", async () => {
    mockUser = { userId: 42 };
    mockDnaFindUnique.mockResolvedValue({
      storyFocus: 20,
      emotionalWeight: 30,
      pace: 80,
      darkness: 90,
      scope: 50,
      complexity: 70,
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/books/match",
    });

    expect(res.statusCode).toBe(200);
    const books = res.json().data.books;
    expect(books.length).toBeGreaterThan(0);
    expect(books[0].slug).toBe("dark-book");
  });

  it("исключает книгу по exclude", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/books/match?darkness=90&exclude=dark-book",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.books.map((b: { slug: string }) => b.slug)).toEqual(["light-book"]);
  });

  it("не перехватывается slug-роутом (ответ — массив books, не редирект/404)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/books/match?pace=50",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.books).toBeDefined();
  });

  it("genres-only: без слайдеров, но с genres — 200", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/books/match?genres=fantasy",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.books).toBeDefined();
  });

  it("мусорные genre id игнорируются: только мусор → 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/books/match?genres=абракадабра",
    });
    expect(res.statusCode).toBe(400);
  });

  it("слайдер + мусорный genres → 200 (слайдер спасает)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/books/match?darkness=90&genres=мусор",
    });
    expect(res.statusCode).toBe(200);
  });
});
