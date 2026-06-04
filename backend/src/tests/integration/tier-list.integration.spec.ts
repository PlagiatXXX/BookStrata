import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList } from "./helpers.js";

import type { TestContext } from "./helpers.js";

describe("CRUD Tier List", () => {
  let ctx: TestContext;
  let token: string;

  beforeAll(async () => {
    ctx = await createTestServer();
    await registerUser(ctx.fastify, "tlcreator1", "tlcreator1@test.com", "StrongPass1!");
    const loginRes = await loginUser(ctx.fastify, "tlcreator1", "StrongPass1!");
    token = extractToken(loginRes);
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен создать тир-лист", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/tier-lists",
      headers: { Authorization: `Bearer ${token}` },
      payload: { title: "Мой тестовый список" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe("Мой тестовый список");
  });

  it("должен вернуть список тир-листов пользователя", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/tier-lists",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("должен создать, прочитать и удалить тир-лист", async () => {
    const createRes = await ctx.fastify.inject({
      method: "POST",
      url: "/api/tier-lists",
      headers: { Authorization: `Bearer ${token}` },
      payload: { title: "Для удаления" },
    });
    expect(createRes.statusCode).toBe(201);
    const listId = JSON.parse(createRes.body).data.id;

    const getRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).data.title).toBe("Для удаления");

    const deleteRes = await ctx.fastify.inject({
      method: "DELETE",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteRes.statusCode).toBe(200);

    const getAfterDelete = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getAfterDelete.statusCode).toBe(404);
  });

  it("должен вернуть 401 без токена", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/tier-lists",
      payload: { title: "Без авторизации" },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe("BOLA — защита чужих тир-листов", () => {
  let ctx: TestContext;
  let tokenA: string;
  let tokenB: string;
  let listId: string;

  beforeAll(async () => {
    ctx = await createTestServer();
    await registerUser(ctx.fastify, "bolauser_a", "bola_a@test.com", "StrongPass1!");
    const loginA = await loginUser(ctx.fastify, "bolauser_a", "StrongPass1!");
    tokenA = extractToken(loginA);

    await registerUser(ctx.fastify, "bolauser_b", "bola_b@test.com", "StrongPass1!");
    const loginB = await loginUser(ctx.fastify, "bolauser_b", "StrongPass1!");
    tokenB = extractToken(loginB);

    const createRes = await createTierList(ctx.fastify, tokenA, "Список пользователя A");
    listId = JSON.parse(createRes.body).data.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен запретить user B обновлять тир-лист user A", async () => {
    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${tokenB}` },
      payload: { title: "Хакнутый заголовок" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("должен запретить user B удалять тир-лист user A", async () => {
    const res = await ctx.fastify.inject({
      method: "DELETE",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("должен запретить user B добавлять книги в тир-лист user A", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listId}/books`,
      headers: { Authorization: `Bearer ${tokenB}` },
      payload: {
        books: [{ title: "Чужая книга", coverImageUrl: "https://example.com/cover.jpg" }],
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("должен разрешить user A обновлять свой тир-лист", async () => {
    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { title: "Новый заголовок" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.title).toBe("Новый заголовок");
  });
});
