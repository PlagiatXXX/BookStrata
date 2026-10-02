// backend/src/modules/authors/authors.route.spec.ts
// Публичный GET /api/authors/:slug — данные страницы автора:
//   - автор с seoDescription → 200 + { data: AuthorPageData },
//   - неизвестный slug → 404,
//   - автор без seoDescription → 200 (страница живёт по ручному контенту).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";
import type { PrismaClient } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  prisma: {
    author: { findUnique: vi.fn(), findMany: vi.fn() },
    bookPlacement: { findMany: vi.fn() },
  },
}));

import { authorsRoutes } from "./authors.route.js";
import { ErrorCodes } from "../../lib/api-response.js";

describe("GET /api/authors/:slug", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    instance.decorate("prisma", mocks.prisma as unknown as PrismaClient);
    await instance.register(authorsRoutes, { prefix: "/api/authors" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.prisma.bookPlacement.findMany.mockResolvedValue([]);
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  it("автор с seoDescription → 200 + data", async () => {
    // findUnique мокаётся сервису — возвращаем «сырой» вид из Prisma
    mocks.prisma.author.findUnique.mockResolvedValue({
      id: 1,
      name: "Лев Толстой",
      slug: "lev-tolstoy",
      seoDescription: "Русский писатель, классик.",
      books: [],
    });

    const res = await request(app.server).get("/api/authors/lev-tolstoy");

    expect(res.status).toBe(200);
    expect(res.body.data.author.slug).toBe("lev-tolstoy");
    expect(res.body.data.author.bookCount).toBe(0);
    expect(mocks.prisma.author.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "lev-tolstoy" } }),
    );
  });

  it("неизвестный slug → 404 с error.code", async () => {
    mocks.prisma.author.findUnique.mockResolvedValue(null);

    const res = await request(app.server).get("/api/authors/net-takogo");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCodes.NOT_FOUND);
    expect(mocks.prisma.bookPlacement.findMany).not.toHaveBeenCalled();
  });

  it("автор без seoDescription → 200 (ручной контент публикуется)", async () => {
    mocks.prisma.author.findUnique.mockResolvedValue({
      id: 2,
      name: "Без описания",
      slug: "bez-opisaniya",
      seoDescription: null,
      books: [],
    });

    const res = await request(app.server).get("/api/authors/bez-opisaniya");

    expect(res.status).toBe(200);
    expect(res.body.data.author.seoDescription).toBe("");
  });

  it("GET /api/authors/ (со слэшем) — статический роут списка, а не :slug", async () => {
    mocks.prisma.author.findMany.mockResolvedValue([]);

    const res = await request(app.server).get("/api/authors/");

    expect(res.status).toBe(200);
    expect(res.body.data.authors).toEqual([]);
    expect(mocks.prisma.author.findUnique).not.toHaveBeenCalled();
  });
});

// ——— GET /api/authors — список всех авторов (страница «Все авторы») ———

describe("GET /api/authors", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    instance.decorate("prisma", mocks.prisma as unknown as PrismaClient);
    await instance.register(authorsRoutes, { prefix: "/api/authors" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  it("200 + authors (имя, slug, число книг)", async () => {
    mocks.prisma.author.findMany.mockResolvedValue([
      { id: 1, name: "Лев Толстой", slug: "lev-tolstoy", _count: { books: 3 } },
      { id: 2, name: "Артур Конан Дойл", slug: "arthur-conan-doyle", _count: { books: 1 } },
    ]);

    const res = await request(app.server).get("/api/authors");

    expect(res.status).toBe(200);
    expect(res.body.data.authors).toEqual([
      { id: 1, name: "Лев Толстой", slug: "lev-tolstoy", bookCount: 3 },
      { id: 2, name: "Артур Конан Дойл", slug: "arthur-conan-doyle", bookCount: 1 },
    ]);
    expect(mocks.prisma.author.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { books: { some: { status: "published", userId: null } } },
        orderBy: { name: "asc" },
      }),
    );
  });

  it("пустая БД → 200 + пустой массив", async () => {
    mocks.prisma.author.findMany.mockResolvedValue([]);

    const res = await request(app.server).get("/api/authors");

    expect(res.status).toBe(200);
    expect(res.body.data.authors).toEqual([]);
  });

  it("sort=popular&limit=1 → популярные авторы, ограниченные", async () => {
    mocks.prisma.author.findMany.mockResolvedValue([
      { id: 1, name: "Лев Толстой", slug: "lev-tolstoy", _count: { books: 3 } },
      { id: 2, name: "Артур Конан Дойл", slug: "arthur-conan-doyle", _count: { books: 8 } },
    ]);

    const res = await request(app.server).get("/api/authors?sort=popular&limit=1");

    expect(res.status).toBe(200);
    expect(res.body.data.authors).toEqual([
      { id: 2, name: "Артур Конан Дойл", slug: "arthur-conan-doyle", bookCount: 8 },
    ]);
  });
});
