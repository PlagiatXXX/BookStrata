// backend/src/modules/admin-authors/admin-authors.route.spec.ts
// Админ-роуты контента автора: только admin, list/get/put, Zod-валидация входа.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";
import type { PrismaClient } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  prisma: {
    author: { findMany: vi.fn(), findUnique: vi.fn() },
    book: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
  uploadBase64: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks.prisma }));
vi.mock("../../lib/upload.js", () => ({ uploadBase64: mocks.uploadBase64 }));
vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, _reply: any, done: any) => {
    const authHeader = request.headers.authorization;
    if (authHeader === "Bearer admin-token") {
      request.user = { userId: 1, username: "admin", role: "admin" };
    } else if (authHeader === "Bearer user-token") {
      request.user = { userId: 2, username: "user", role: "user" };
    }
    done();
  }),
}));
vi.mock("../../middleware/requireRole.js", () => ({
  requireRole: (...roles: string[]) => {
    return (request: any, reply: any, done: any) => {
      if (!request.user) reply.code(401).send({ error: { code: "unauthorized" } });
      else if (roles.includes(request.user?.role)) done();
      else reply.code(403).send({ error: { code: "forbidden" } });
    };
  },
}));

import { adminAuthorsRoutes } from "./admin-authors.route.js";
import { AdminAuthorError } from "./admin-authors.service.js";

describe("admin-authors routes", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    instance.decorate("prisma", mocks.prisma as unknown as PrismaClient);
    await instance.register(adminAuthorsRoutes, { prefix: "/api/admin/authors" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("без токена → 401", async () => {
    const res = await request(app.server).get("/api/admin/authors");
    expect(res.status).toBe(401);
  });

  it("токен обычного пользователя → 403", async () => {
    const res = await request(app.server)
      .get("/api/admin/authors")
      .set("Authorization", "Bearer user-token");
    expect(res.status).toBe(403);
  });

  it("admin: GET / → 200 со списком авторов", async () => {
    mocks.prisma.author.findMany.mockResolvedValue([
      { id: 1, name: "Вэнс", slug: "vans", _count: { stats: 1, showcase: 0, adaptations: 0, pressQuotes: 2 } },
    ]);
    const res = await request(app.server)
      .get("/api/admin/authors?q=вэнс")
      .set("Authorization", "Bearer admin-token");
    expect(res.status).toBe(200);
    expect(res.body.data.authors[0]).toMatchObject({ id: 1, name: "Вэнс", statsCount: 1 });
    expect(mocks.prisma.author.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: { contains: "вэнс", mode: "insensitive" } } }),
    );
  });

  it("admin: GET /:id/content несуществующего → 404", async () => {
    mocks.prisma.author.findUnique.mockResolvedValue(null);
    const res = await request(app.server)
      .get("/api/admin/authors/99/content")
      .set("Authorization", "Bearer admin-token");
    expect(res.status).toBe(404);
  });

  it("admin: GET /:id/content с нечисловым id → 404, Prisma не вызывается", async () => {
    const res = await request(app.server)
      .get("/api/admin/authors/abc/content")
      .set("Authorization", "Bearer admin-token");
    expect(res.status).toBe(404);
    expect(mocks.prisma.author.findUnique).not.toHaveBeenCalled();
  });

  it("admin: PUT /:id/content с нечисловым id → 404, транзакция не вызвана", async () => {
    const res = await request(app.server)
      .put("/api/admin/authors/abc/content")
      .set("Authorization", "Bearer admin-token")
      .send({ badge: "Лауреат" });
    expect(res.status).toBe(404);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("admin: GET / при ошибке сервиса — ответ через handleError (AdminAuthorError → 404)", async () => {
    mocks.prisma.author.findMany.mockRejectedValue(
      new AdminAuthorError("author_not_found", "Автор не найден"),
    );
    const res = await request(app.server)
      .get("/api/admin/authors")
      .set("Authorization", "Bearer admin-token");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: { code: "not_found" } });
  });

  it("admin: PUT /:id/content с валидным телом → 200 и $transaction вызван", async () => {
    mocks.prisma.book.findMany.mockResolvedValue([{ id: 7 }]);
    mocks.prisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        author: { update: vi.fn().mockResolvedValue({}) },
        authorStat: { deleteMany: vi.fn(), createMany: vi.fn() },
        authorShowcase: { deleteMany: vi.fn(), createMany: vi.fn() },
        authorAdaptation: { deleteMany: vi.fn(), createMany: vi.fn() },
        authorPressQuote: { deleteMany: vi.fn(), createMany: vi.fn() },
      }),
    );

    const res = await request(app.server)
      .put("/api/admin/authors/1/content")
      .set("Authorization", "Bearer admin-token")
      .send({
        badge: "Лауреат",
        stats: [{ value: "14 млн", label: "книг" }],
        showcase: [{ bookId: 7, pullQuote: null }],
      });

    expect(res.status).toBe(200);
    expect(mocks.prisma.$transaction).toHaveBeenCalled();
  });

  it("admin: PUT с невалидным kind → 400, транзакция не вызвана", async () => {
    const res = await request(app.server)
      .put("/api/admin/authors/1/content")
      .set("Authorization", "Bearer admin-token")
      .send({ adaptations: [{ kind: "podcast", title: "X" }] });
    expect(res.status).toBe(400);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("admin: POST /upload-hero без токена → 401, storage не вызван", async () => {
    const res = await request(app.server)
      .post("/api/admin/authors/upload-hero")
      .send({ heroImageUrl: "data:image/webp;base64,AAAA" });
    expect(res.status).toBe(401);
    expect(mocks.uploadBase64).not.toHaveBeenCalled();
  });

  it("admin: POST /upload-hero невалидный body (не base64) → 400", async () => {
    const res = await request(app.server)
      .post("/api/admin/authors/upload-hero")
      .set("Authorization", "Bearer admin-token")
      .send({ heroImageUrl: "https://example.com/photo.jpg" });
    expect(res.status).toBe(400);
    expect(mocks.uploadBase64).not.toHaveBeenCalled();
  });

  it("admin: POST /upload-hero успех → 200 + data.heroImageUrl", async () => {
    mocks.uploadBase64.mockResolvedValue({ url: "https://cdn.example.com/hero.webp" });

    const res = await request(app.server)
      .post("/api/admin/authors/upload-hero")
      .set("Authorization", "Bearer admin-token")
      .send({ heroImageUrl: "data:image/webp;base64,AAAA" });

    expect(res.status).toBe(200);
    expect(res.body.data.heroImageUrl).toBe("https://cdn.example.com/hero.webp");
    expect(mocks.uploadBase64).toHaveBeenCalledWith(
      "data:image/webp;base64,AAAA",
      "tiermaker-pro/author-heroes",
    );
  });
});
