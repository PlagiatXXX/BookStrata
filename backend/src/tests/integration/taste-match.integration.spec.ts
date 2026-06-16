import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Taste Match", () => {
  let ctx: TestContext;
  let tokenA: string;
  let tokenB: string;
  let userIdA: number;
  let listIdA: string;
  let listIdB: string;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "taste_a", "taste_a@test.com", "StrongPass1!");
    const loginA = await loginUser(ctx.fastify, "taste_a", "StrongPass1!");
    tokenA = extractToken(loginA);
    const meA = await ctx.fastify.inject({
      method: "GET",
      url: "/api/users/me",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    userIdA = JSON.parse(meA.body).data.id;

    await registerUser(ctx.fastify, "taste_b", "taste_b@test.com", "StrongPass1!");
    const loginB = await loginUser(ctx.fastify, "taste_b", "StrongPass1!");
    tokenB = extractToken(loginB);

    const listResA = await createTierList(ctx.fastify, tokenA, "Taste A");
    listIdA = JSON.parse(listResA.body).data.id;

    const listResB = await createTierList(ctx.fastify, tokenB, "Taste B");
    listIdB = JSON.parse(listResB.body).data.id;

    // User A: добавляет книги, делает публичным
    await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listIdA}/books`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        books: [
          { title: "Общая книга", coverImageUrl: "https://example.com/a.jpg" },
          { title: "Эксклюзив A", coverImageUrl: "https://example.com/a2.jpg" },
        ],
      },
    });

    // User B: добавляет одну общую + одну уникальную
    await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listIdB}/books`,
      headers: { Authorization: `Bearer ${tokenB}` },
      payload: {
        books: [
          { title: "Общая книга", coverImageUrl: "https://example.com/b.jpg" },
          { title: "Эксклюзив B", coverImageUrl: "https://example.com/b2.jpg" },
        ],
      },
    });

    await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${listIdA}/public`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { isPublic: true },
    });
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен посчитать совпадение вкусов", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/users/${userIdA}/taste-match`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.commonBooks).toBe(1);
    expect(data.totalBooks).toBe(2);
    expect(data.matchPercent).toBeGreaterThan(0);
  });

  it("должен вернуть 0 совпадений для пользователя без книг", async () => {
    await registerUser(ctx.fastify, "taste_c", "taste_c@test.com", "StrongPass1!");
    const loginC = await loginUser(ctx.fastify, "taste_c", "StrongPass1!");
    const tokenC = extractToken(loginC);

    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/users/${userIdA}/taste-match`,
      headers: { Authorization: `Bearer ${tokenC}` },
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.commonBooks).toBe(0);
  });
});
