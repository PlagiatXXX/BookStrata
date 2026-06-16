import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList, getMe } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Публичный доступ к GET /:id + Users профили/статистика", () => {
  let ctx: TestContext;
  let tokenA: string;
  let tokenB: string;
  let userIdA: number;
  let publicListId: string;
  let privateListId: string;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "pubaccess_a", "pubaccess_a@test.com", "StrongPass1!");
    const loginA = await loginUser(ctx.fastify, "pubaccess_a", "StrongPass1!");
    tokenA = extractToken(loginA);
    const meA = await getMe(ctx.fastify, tokenA);
    userIdA = JSON.parse(meA.body).data.id;

    await registerUser(ctx.fastify, "pubaccess_b", "pubaccess_b@test.com", "StrongPass1!");
    const loginB = await loginUser(ctx.fastify, "pubaccess_b", "StrongPass1!");
    tokenB = extractToken(loginB);
    const pubRes = await createTierList(ctx.fastify, tokenA, "Публичный");
    publicListId = JSON.parse(pubRes.body).data.id;
    await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${publicListId}/public`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { isPublic: true },
    });

    const privRes = await createTierList(ctx.fastify, tokenA, "Приватный");
    privateListId = JSON.parse(privRes.body).data.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  describe("GET /:id — публичный доступ", () => {
    it("должен отдать публичный список без токена", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: `/api/tier-lists/${publicListId}`,
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.title).toBe("Публичный");
      expect(data.isPublic).toBe(true);
    });

    it("должен запретить доступ к приватному списку без токена", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: `/api/tier-lists/${privateListId}`,
      });

      expect(res.statusCode).toBe(403);
    });

    it("должен разрешить владельцу доступ к приватному списку", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: `/api/tier-lists/${privateListId}`,
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.title).toBe("Приватный");
    });
  });

  describe("GET /api/users/:id", () => {
    it("должен вернуть профиль другого пользователя", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: `/api/users/${userIdA}`,
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.username).toBe("pubaccess_a");
      expect(data.stats).toBeDefined();
      expect(typeof data.stats.tierListsCount).toBe("number");
    });

    it("должен вернуть ошибку для несуществующего пользователя", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/users/999999999",
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /api/users/:id/tier-lists", () => {
    it("должен вернуть публичные списки пользователя", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: `/api/users/${userIdA}/tier-lists`,
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("GET /api/users/me/stats", () => {
    it("должен вернуть статистику текущего пользователя", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/users/me/stats",
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(typeof data.tierListsCount).toBe("number");
      expect(typeof data.likesCount).toBe("number");
      expect(typeof data.totalBooks).toBe("number");
    });

    it("должен вернуть 401 без токена", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/users/me/stats",
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
