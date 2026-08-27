// backend/src/modules/books/books.route.spec.ts
// Регресс-тест авторизованных эндпоинтов книг: request.user, который ставит
// глобальный authPlugin, имеет форму { userId, username, role } — роуты должны
// читать user.userId (а не user.id). До 13.08.2026 здесь был user?.id → все
// авторизованные эндпоинты книг отдавали 401 даже с валидным токеном.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";

const mocks = vi.hoisted(() => ({
  prisma: {
    book: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  searchBooks: vi.fn(),
  getBookPageData: vi.fn(),
  toggleBookLike: vi.fn(),
  getBookComments: vi.fn(),
  createBookComment: vi.fn(),
  updateBookComment: vi.fn(),
  deleteBookComment: vi.fn(),
  toggleBookCommentLike: vi.fn(),
  addBooksToTierList: vi.fn(),
  assertOwner: vi.fn(),
  searchCatalogBooks: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks.prisma }));
vi.mock("./books.service.js", () => ({ searchBooks: mocks.searchBooks }));
vi.mock("./bookPage.service.js", () => ({ getBookPageData: mocks.getBookPageData }));
vi.mock("./bookLike.service.js", () => ({ toggleBookLike: mocks.toggleBookLike }));
vi.mock("./bookComment.service.js", () => ({
  getBookComments: mocks.getBookComments,
  createBookComment: mocks.createBookComment,
  updateBookComment: mocks.updateBookComment,
  deleteBookComment: mocks.deleteBookComment,
  toggleBookCommentLike: mocks.toggleBookCommentLike,
}));
vi.mock("../tier-lists/tierList.books.service.js", () => ({
  addBooksToTierList: mocks.addBooksToTierList,
}));
vi.mock("./catalogSearch.service.js", () => ({
  searchCatalogBooks: mocks.searchCatalogBooks,
}));
vi.mock("../tier-lists/tierList.utils.js", () => ({
  assertOwner: mocks.assertOwner,
}));
vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, _reply: any, done: any) => {
    // Повторяем поведение реального authPlugin: request.user = { userId, ... }
    if (request.headers.authorization === "Bearer valid-token") {
      request.user = { userId: 7, username: "reader", role: "user" };
    }
    done();
  }),
}));

import { booksRoutes } from "./books.route.js";

async function buildApp() {
  const app = Fastify();
  // Имитация глобального authPlugin: ставит request.user для любого запроса
  // с валидным токеном (важно для публичного GET /:slug → userLike).
  app.addHook("onRequest", (request: any, _reply: any, done: any) => {
    if (request.headers.authorization === "Bearer valid-token") {
      request.user = { userId: 7, username: "reader", role: "user" };
    }
    done();
  });
  await app.register(booksRoutes, { prefix: "/api/books" });
  await app.ready();
  return app;
}

describe("books.route.ts — request.user.userId (регресс user?.id → 401)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.prisma.book.findUnique.mockResolvedValue({
      id: 1,
      title: "Анна Каренина",
      author: "Лев Толстой",
      coverImageUrl: "/c.jpg",
      externalId: null,
      source: "local",
      status: "published",
    });
    mocks.toggleBookLike.mockResolvedValue({ liked: true, likesCount: 6 });
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST /:slug/like с валидным токеном проходит и передаёт userId=7", async () => {
    const res = await request(app.server)
      .post("/api/books/anna-karenina-lev-tolstoj/like")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(mocks.toggleBookLike).toHaveBeenCalledWith("anna-karenina-lev-tolstoj", 7);
  });

  it("POST /:slug/like без токена → 401, сервис не вызван", async () => {
    const res = await request(app.server)
      .post("/api/books/anna-karenina-lev-tolstoj/like");

    expect(res.status).toBe(401);
    expect(mocks.toggleBookLike).not.toHaveBeenCalled();
  });

  it("POST /:slug/comments с токеном создаёт комментарий от userId=7", async () => {
    mocks.createBookComment.mockResolvedValue({ id: 5, content: "Шедевр" });

    const res = await request(app.server)
      .post("/api/books/anna-karenina-lev-tolstoj/comments")
      .set("Authorization", "Bearer valid-token")
      .send({ content: "Шедевр" });

    expect(res.status).toBe(201);
    expect(mocks.createBookComment).toHaveBeenCalledWith(
      "anna-karenina-lev-tolstoj", 7, "Шедевр", undefined,
    );
  });

  it("PATCH /:slug/comments/:id — правка от userId=7 с ролью", async () => {
    mocks.updateBookComment.mockResolvedValue({ id: 5, content: "Исправлено" });

    const res = await request(app.server)
      .patch("/api/books/anna-karenina-lev-tolstoj/comments/5")
      .set("Authorization", "Bearer valid-token")
      .send({ content: "Исправлено" });

    expect(res.status).toBe(200);
    expect(mocks.updateBookComment).toHaveBeenCalledWith(5, 7, "user", "Исправлено");
  });

  it("DELETE /:slug/comments/:id — удаление от userId=7", async () => {
    mocks.deleteBookComment.mockResolvedValue({ success: true });

    const res = await request(app.server)
      .delete("/api/books/anna-karenina-lev-tolstoj/comments/5")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(mocks.deleteBookComment).toHaveBeenCalledWith(5, 7, "user");
  });

  it("POST /:slug/comments/:id/like — лайк комментария от userId=7", async () => {
    mocks.toggleBookCommentLike.mockResolvedValue({ liked: true, likesCount: 1 });

    const res = await request(app.server)
      .post("/api/books/anna-karenina-lev-tolstoj/comments/5/like")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(mocks.toggleBookCommentLike).toHaveBeenCalledWith(5, 7);
  });

  it("GET /:slug с токеном передаёт userId=7 в getBookPageData (userLike)", async () => {
    mocks.getBookPageData.mockResolvedValue({ book: { id: 1 }, userLike: true });

    const res = await request(app.server)
      .get("/api/books/anna-karenina-lev-tolstoj")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(mocks.getBookPageData).toHaveBeenCalledWith("anna-karenina-lev-tolstoj", 7);
  });

  it("POST /:slug/tier-lists с токеном добавляет в лист от userId=7", async () => {
    mocks.assertOwner.mockResolvedValue(undefined);
    mocks.addBooksToTierList.mockResolvedValue([{ id: "p1" }]);

    const res = await request(app.server)
      .post("/api/books/anna-karenina-lev-tolstoj/tier-lists")
      .set("Authorization", "Bearer valid-token")
      .send({ tierListId: "tl-1" });

    expect(res.status).toBe(201);
    expect(mocks.assertOwner).toHaveBeenCalledWith("tl-1", 7);
    expect(mocks.addBooksToTierList).toHaveBeenCalledWith(
      "tl-1",
      expect.arrayContaining([expect.objectContaining({ title: "Анна Каренина" })]),
    );
  });

  it("GET /catalog-search — публичный поиск каталога", async () => {
    mocks.searchCatalogBooks.mockResolvedValue([
      { id: 1, title: "Дюна", author: "Герберт", slug: "dune", coverImageUrl: "/c/dune.jpg", rating: 9.0 },
    ]);

    const res = await request(app.server).get("/api/books/catalog-search?q=Дюна");
    expect(res.status).toBe(200);
    expect(res.body.data.books).toHaveLength(1);
    expect(res.body.data.books[0].title).toBe("Дюна");
  });

  it("GET /catalog-search — отклоняет короткий запрос", async () => {
    const res = await request(app.server).get("/api/books/catalog-search?q=a");
    expect(res.status).toBe(400);
  });
});
