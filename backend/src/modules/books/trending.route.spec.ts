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

describe("GET /api/books/trending", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    const { booksRoutes } = await import("./books.route.js");
    await instance.register(booksRoutes, { prefix: "/api/books" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => { vi.clearAllMocks(); app = await createApp(); });
  afterEach(async () => { await app.close(); });

  it("отдаёт трендовые книги с cache-заголовком", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.book.findMany).mockResolvedValue([
      { id: 1, slug: "dune", title: "Дюна", author: "Герберт", coverImageUrl: "/c/dune.jpg" },
    ] as any);

    const res = await request(app.server).get("/api/books/trending");
    expect(res.statusCode).toBe(200);
    expect(res.body.data.books).toHaveLength(1);
    expect(res.headers["cache-control"]).toContain("max-age=300");
  });

  it("отдаёт пустой массив когда нет трендовых книг", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.book.findMany).mockResolvedValue([]);
    const res = await request(app.server).get("/api/books/trending");
    expect(res.statusCode).toBe(200);
    expect(res.body.data.books).toEqual([]);
  });
});
