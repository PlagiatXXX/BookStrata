import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Book CRUD", () => {
  let ctx: TestContext;
  let token: string;
  let tokenB: string;
  let listId: string;
  let bookId: number;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "bookcrud", "bookcrud@test.com", "StrongPass1!");
    const loginA = await loginUser(ctx.fastify, "bookcrud", "StrongPass1!");
    token = extractToken(loginA);

    await registerUser(ctx.fastify, "bookcrud_other", "bookcrud_other@test.com", "StrongPass1!");
    const loginB = await loginUser(ctx.fastify, "bookcrud_other", "StrongPass1!");
    tokenB = extractToken(loginB);

    const listRes = await createTierList(ctx.fastify, token, "Книжный CRUD");
    listId = JSON.parse(listRes.body).data.id;

    // Добавляем книгу
    const addRes = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listId}/books`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        books: [{ title: "Исходная книга", coverImageUrl: "https://example.com/cover.jpg" }],
      },
    });
    bookId = JSON.parse(addRes.body).data.results[0].book.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  describe("PUT /:id/books/:bookId — обновление книги", () => {
    it("должен обновить название книги", async () => {
      const res = await ctx.fastify.inject({
        method: "PUT",
        url: `/api/tier-lists/${listId}/books/${bookId}`,
        headers: { Authorization: `Bearer ${token}` },
        payload: { title: "Обновлённое название" },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.title).toBe("Обновлённое название");
    });

    it("должен обновить мысли о книге", async () => {
      const res = await ctx.fastify.inject({
        method: "PUT",
        url: `/api/tier-lists/${listId}/books/${bookId}`,
        headers: { Authorization: `Bearer ${token}` },
        payload: { thoughts: "Отличная книга!" },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.thoughts).toBe("Отличная книга!");
    });

    it("должен обновить автора", async () => {
      const res = await ctx.fastify.inject({
        method: "PUT",
        url: `/api/tier-lists/${listId}/books/${bookId}`,
        headers: { Authorization: `Bearer ${token}` },
        payload: { author: "Новый автор" },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.author).toBe("Новый автор");
    });

    it("должен запретить обновление книги в чужом списке", async () => {
      const res = await ctx.fastify.inject({
        method: "PUT",
        url: `/api/tier-lists/${listId}/books/${bookId}`,
        headers: { Authorization: `Bearer ${tokenB}` },
        payload: { title: "Хакнутая" },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("DELETE /:id/books/:bookId — удаление книги", () => {
    let tmpBookId: number;

    beforeAll(async () => {
      const addRes = await ctx.fastify.inject({
        method: "POST",
        url: `/api/tier-lists/${listId}/books`,
        headers: { Authorization: `Bearer ${token}` },
        payload: {
          books: [{ title: "На удаление", coverImageUrl: "https://example.com/del.jpg" }],
        },
      });
      tmpBookId = JSON.parse(addRes.body).data.results[0].book.id;
    });

    it("должен удалить книгу", async () => {
      const res = await ctx.fastify.inject({
        method: "DELETE",
        url: `/api/tier-lists/${listId}/books/${tmpBookId}`,
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.message).toBe("Book removed");
    });

    it("должен вернуть 200 при повторном удалении (идемпотентность)", async () => {
      const res = await ctx.fastify.inject({
        method: "DELETE",
        url: `/api/tier-lists/${listId}/books/${tmpBookId}`,
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it("должен запретить удаление книги из чужого списка", async () => {
      const res = await ctx.fastify.inject({
        method: "DELETE",
        url: `/api/tier-lists/${listId}/books/${bookId}`,
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("POST /:id/books/search — поиск книги", () => {
    it("должен вернуть 400 если нет coverUrl", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: `/api/tier-lists/${listId}/books/search`,
        headers: { Authorization: `Bearer ${token}` },
        payload: { title: "Test Book", author: "Author", coverUrl: "" },
      });

      expect(res.statusCode).toBe(400);
    });

    it("должен вернуть 403 для чужого списка", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: `/api/tier-lists/${listId}/books/search`,
        headers: { Authorization: `Bearer ${tokenB}` },
        payload: { title: "Test", coverUrl: "https://example.com/c.jpg" },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
