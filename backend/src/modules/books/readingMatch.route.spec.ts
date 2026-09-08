import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    book: { findMany: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((_req: any, _reply: any, done: any) => done()),
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
    readingProfile: { ...PROFILE, darkness },
  };
}

describe("GET /api/books/match", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    const { booksRoutes } = await import("./books.route.js");
    await instance.register(booksRoutes, { prefix: "/api/books" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.book.findMany).mockResolvedValue([
      bookRow(1, "dark-book", "Тёмная", 90),
      bookRow(2, "light-book", "Светлая", 10),
    ] as any);
    app = await createApp();
  });
  afterEach(async () => { await app.close(); });

  it("отдаёт топ-N книг с score, отсортированный по убыванию", async () => {
    const res = await request(app.server).get("/api/books/match?darkness=90&limit=2");
    expect(res.statusCode).toBe(200);
    const books = res.body.data.books;
    expect(books).toHaveLength(2);
    expect(books[0].slug).toBe("dark-book");
    expect(books[0].score).toBeGreaterThan(books[1].score);
    expect(books[0]).toHaveProperty("coverImageUrl");
    expect(books[0]).toHaveProperty("author");
  });

  it("400, если ни одна ось не задана", async () => {
    const res = await request(app.server).get("/api/books/match");
    expect(res.statusCode).toBe(400);
  });

  it("исключает книгу по exclude", async () => {
    const res = await request(app.server).get("/api/books/match?darkness=90&exclude=dark-book");
    expect(res.statusCode).toBe(200);
    expect(res.body.data.books.map((b: { slug: string }) => b.slug)).toEqual(["light-book"]);
  });

  it("не перехватывается slug-роутом (ответ — массив books, не редирект/404)", async () => {
    const res = await request(app.server).get("/api/books/match?pace=50");
    expect(res.statusCode).toBe(200);
    expect(res.body.data.books).toBeDefined();
  });
});
