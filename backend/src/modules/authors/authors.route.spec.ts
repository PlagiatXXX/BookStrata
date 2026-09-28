// backend/src/modules/authors/authors.route.spec.ts
// Публичный GET /api/authors/:slug — данные страницы автора:
//   - автор с seoDescription → 200 + { data: AuthorPageData },
//   - неизвестный slug → 404,
//   - автор без seoDescription → 404 (страница не публикуется).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";
import type { PrismaClient } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  prisma: {
    author: { findUnique: vi.fn() },
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

  it("автор без seoDescription → 404 (страница не публикуется)", async () => {
    mocks.prisma.author.findUnique.mockResolvedValue({
      id: 2,
      name: "Без описания",
      slug: "bez-opisaniya",
      seoDescription: null,
      books: [],
    });

    const res = await request(app.server).get("/api/authors/bez-opisaniya");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCodes.NOT_FOUND);
  });

  it("валидация params: пустой slug → 400, сервис не вызывается", async () => {
    const res = await request(app.server).get("/api/authors/");

    expect(res.status).toBe(400);
    expect(mocks.prisma.author.findUnique).not.toHaveBeenCalled();
  });
});
