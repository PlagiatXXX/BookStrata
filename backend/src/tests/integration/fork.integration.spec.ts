import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList } from "./helpers.js";

import type { TestContext } from "./helpers.js";

describe("Fork тир-листа", () => {
  let ctx: TestContext;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let publicListId: string;
  let privateListId: string;

  beforeAll(async () => {
    ctx = await createTestServer();
    await registerUser(ctx.fastify, "fork_owner", "fork_owner@test.com", "StrongPass1!");
    const loginA = await loginUser(ctx.fastify, "fork_owner", "StrongPass1!");
    tokenA = extractToken(loginA);

    await registerUser(ctx.fastify, "fork_user", "fork_user@test.com", "StrongPass1!");
    const loginB = await loginUser(ctx.fastify, "fork_user", "StrongPass1!");
    tokenB = extractToken(loginB);

    await registerUser(ctx.fastify, "fork_other", "fork_other@test.com", "StrongPass1!");
    const loginC = await loginUser(ctx.fastify, "fork_other", "StrongPass1!");
    tokenC = extractToken(loginC);

    // Публичный список с тирами и книгами
    const pubRes = await createTierList(ctx.fastify, tokenA, "Оригинал");
    publicListId = JSON.parse(pubRes.body).data.id;

    await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${publicListId}/tiers`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { added: [{ title: "S", color: "#ff0000", rank: 0 }] },
    });

    const addBooksRes = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${publicListId}/books`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        books: [{ title: "Книга оригинала", coverImageUrl: "https://example.com/cover.jpg" }],
      },
    });
    const bookId = JSON.parse(addBooksRes.body).data.results[0].book.id;

    const tiersRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${publicListId}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const tierId = JSON.parse(tiersRes.body).data.tiers[0].id;

    await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${publicListId}/placements`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { placements: [{ bookId, tierId, rank: 0 }] },
    });

    await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${publicListId}/public`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { isPublic: true },
    });

    // Приватный список
    const privRes = await createTierList(ctx.fastify, tokenC, "Приватный");
    privateListId = JSON.parse(privRes.body).data.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен скопировать публичный тир-лист с тирами и книгами", async () => {
    const forkRes = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${publicListId}/fork`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(forkRes.statusCode).toBe(201);
    const data = JSON.parse(forkRes.body).data;
    expect(data.title).toBe("Оригинал (копия)");
    expect(data.originalTierListId).toBe(publicListId);
  });

  it("должен иметь те же тиры и книги в скопированном списке", async () => {
    const forkRes = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${publicListId}/fork`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(forkRes.statusCode).toBe(201);
    const data = JSON.parse(forkRes.body).data;
    const forkedId = data.id;

    const detailRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${forkedId}`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(detailRes.statusCode).toBe(200);
    const detail = JSON.parse(detailRes.body).data;
    expect(detail.tiers.length).toBeGreaterThan(0);
    expect(detail.tiers[0].title).toBe("S");
    expect(detail.unrankedBooks.length).toBe(0);
  });

  it("должен запретить форк приватного списка другого пользователя", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${privateListId}/fork`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("должен разрешить владельцу форкнуть свой приватный список", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${privateListId}/fork`,
      headers: { Authorization: `Bearer ${tokenC}` },
    });

    expect(res.statusCode).toBe(201);
  });

  it("не должен изменить оригинальный список после форка", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${publicListId}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.title).toBe("Оригинал");
    expect(data.tiers.length).toBeGreaterThan(0);
  });
});
