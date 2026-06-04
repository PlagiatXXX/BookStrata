import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList } from "./helpers.js";

import type { TestContext } from "./helpers.js";

describe("CRUD тиров и размещение книг", () => {
  let ctx: TestContext;
  let token: string;
  let listId: string;

  beforeAll(async () => {
    ctx = await createTestServer();
    await registerUser(ctx.fastify, "tiermanager", "tiermanager@test.com", "StrongPass1!");
    const loginRes = await loginUser(ctx.fastify, "tiermanager", "StrongPass1!");
    token = extractToken(loginRes);

    const createRes = await createTierList(ctx.fastify, token, "Список с тирами");
    listId = JSON.parse(createRes.body).data.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен добавить тиры в тир-лист", async () => {
    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${listId}/tiers`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        added: [
          { title: "S", color: "#ff0000", rank: 0 },
          { title: "A", color: "#ff8800", rank: 1 },
          { title: "F", color: "#888888", rank: 2 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.length).toBe(3);
  });

  it("должен добавить книги и разместить их по тирам", async () => {
    const addBooksRes = await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listId}/books`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        books: [
          { title: "Книга 1", coverImageUrl: "https://example.com/1.jpg" },
          { title: "Книга 2", coverImageUrl: "https://example.com/2.jpg" },
        ],
      },
    });
    expect(addBooksRes.statusCode).toBe(201);
    const addData = JSON.parse(addBooksRes.body).data;
    const bookId1 = addData.results[0].book.id;

    const tiersRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(tiersRes.statusCode).toBe(200);
    const tiers = JSON.parse(tiersRes.body).data.tiers;
    const tierSId = tiers[0].id;

    const placeRes = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${listId}/placements`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        placements: [{ bookId: bookId1, tierId: tierSId, rank: 0 }],
      },
    });
    expect(placeRes.statusCode).toBe(200);
  });

  it("должен отобразить книгу в тире при получении тир-листа", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    const tierWithBooks = body.tiers.find((t: { items: unknown[] }) => t.items.length > 0);
    expect(tierWithBooks).toBeDefined();
    expect(tierWithBooks.items[0].book.id).toBeGreaterThan(0);
  });

  it("должен удалить пустой тир", async () => {
    const tiersRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const tiers = JSON.parse(tiersRes.body).data.tiers;
    const beforeCount = tiers.length;
    const lastTierId = tiers[tiers.length - 1].id;

    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${listId}/tiers`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { deletedIds: [lastTierId] },
    });
    expect(res.statusCode).toBe(200);

    const getRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const remaining = JSON.parse(getRes.body).data.tiers;
    expect(remaining.length).toBe(beforeCount - 1);
  });
});
