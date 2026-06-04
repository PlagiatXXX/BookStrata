import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList } from "./helpers.js";

import type { TestContext } from "./helpers.js";

describe("Лайки", () => {
  let ctx: TestContext;
  let tokenA: string;
  let tokenB: string;
  let listId: string;

  beforeAll(async () => {
    ctx = await createTestServer();
    await registerUser(ctx.fastify, "like_owner", "like_owner@test.com", "StrongPass1!");
    const loginA = await loginUser(ctx.fastify, "like_owner", "StrongPass1!");
    tokenA = extractToken(loginA);

    await registerUser(ctx.fastify, "like_user", "like_user@test.com", "StrongPass1!");
    const loginB = await loginUser(ctx.fastify, "like_user", "StrongPass1!");
    tokenB = extractToken(loginB);

    const createRes = await createTierList(ctx.fastify, tokenA, "Список для лайков");
    listId = JSON.parse(createRes.body).data.id;

    await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${listId}/public`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { isPublic: true },
    });
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен поставить лайк", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listId}/like`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.isLiked).toBe(true);
    expect(data.likesCount).toBe(1);
  });

  it("должен показать лайк при проверке статуса", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${listId}/likes`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.isLiked).toBe(true);
    expect(data.likesCount).toBe(1);
  });

  it("должен убрать лайк", async () => {
    const res = await ctx.fastify.inject({
      method: "DELETE",
      url: `/api/tier-lists/${listId}/like`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.isLiked).toBe(false);
    expect(data.likesCount).toBe(0);
  });

  it("должен вернуть список лайкнутых тир-листов", async () => {
    await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listId}/like`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/tier-lists/liked",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.length).toBeGreaterThanOrEqual(1);
    const liked = data.find((t: { id: string }) => t.id === listId);
    expect(liked).toBeDefined();
  });

  it("должен вернуть 401 без токена", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listId}/like`,
    });
    expect(res.statusCode).toBe(401);
  });

  it("должен быть идемпотентным при повторном лайке", async () => {
    const res1 = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listId}/like`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res1.statusCode).toBe(200);

    const res2 = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listId}/like`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res2.statusCode).toBe(200);

    const checkRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${listId}/likes`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(JSON.parse(checkRes.body).data.likesCount).toBe(1);
  });
});
