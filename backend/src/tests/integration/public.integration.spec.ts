import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Public — togglePublic + GET /public", () => {
  let ctx: TestContext;
  let tokenA: string;
  let tokenB: string;
  let listId: string;
  let secondListId: string;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "pub_owner", "pub_owner@test.com", "StrongPass1!");
    const loginA = await loginUser(ctx.fastify, "pub_owner", "StrongPass1!");
    tokenA = extractToken(loginA);

    await registerUser(ctx.fastify, "pub_other", "pub_other@test.com", "StrongPass1!");
    const loginB = await loginUser(ctx.fastify, "pub_other", "StrongPass1!");
    tokenB = extractToken(loginB);

    const listRes = await createTierList(ctx.fastify, tokenA, "Публичный список");
    listId = JSON.parse(listRes.body).data.id;

    const secondRes = await createTierList(ctx.fastify, tokenA, "Второй список");
    secondListId = JSON.parse(secondRes.body).data.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  describe("PUT /:id/public", () => {
    it("должен сделать список публичным", async () => {
      const res = await ctx.fastify.inject({
        method: "PUT",
        url: `/api/tier-lists/${listId}/public`,
        headers: { Authorization: `Bearer ${tokenA}` },
        payload: { isPublic: true },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.isPublic).toBe(true);
    });

    it("должен сделать список приватным", async () => {
      const res = await ctx.fastify.inject({
        method: "PUT",
        url: `/api/tier-lists/${listId}/public`,
        headers: { Authorization: `Bearer ${tokenA}` },
        payload: { isPublic: false },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.isPublic).toBe(false);
    });

    it("должен запретить переключение публичности чужого списка", async () => {
      const res = await ctx.fastify.inject({
        method: "PUT",
        url: `/api/tier-lists/${listId}/public`,
        headers: { Authorization: `Bearer ${tokenB}` },
        payload: { isPublic: true },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/tier-lists/public", () => {
    beforeAll(async () => {
      await ctx.fastify.inject({
        method: "PUT",
        url: `/api/tier-lists/${listId}/public`,
        headers: { Authorization: `Bearer ${tokenA}` },
        payload: { isPublic: true },
      });
    });

    it("должен вернуть публичные тир-листы", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/tier-lists/public",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.meta).toBeDefined();
      expect(body.meta.totalItems).toBeGreaterThanOrEqual(1);
    });

    it("не должен включать приватные списки", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/tier-lists/public",
      });
      const body = JSON.parse(res.body);
      const allPublic = body.data.every((tl: { isPublic: boolean }) => tl.isPublic === true);
      expect(allPublic).toBe(true);
    });

    it("должен включать authorName и booksCount", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/tier-lists/public",
      });
      const body = JSON.parse(res.body);
      const item = body.data[0];
      expect(item.authorName).toBeTruthy();
      expect(typeof item.booksCount).toBe("number");
    });

    it("должен поддерживать пагинацию через ?page=1&pageSize=1", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/tier-lists/public?page=1&pageSize=1",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeLessThanOrEqual(1);
      expect(body.meta.totalPages).toBeGreaterThanOrEqual(1);
      expect(body.links).toBeDefined();
    });
  });
});
