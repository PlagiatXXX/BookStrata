import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("SaveAll — атомарное сохранение", () => {
  let ctx: TestContext;
  let token: string;
  let tokenB: string;
  let listId: string;
  let emptyListId: string;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "saveall_owner", "saveall@test.com", "StrongPass1!");
    const loginA = await loginUser(ctx.fastify, "saveall_owner", "StrongPass1!");
    token = extractToken(loginA);

    await registerUser(ctx.fastify, "saveall_other", "saveall_other@test.com", "StrongPass1!");
    const loginB = await loginUser(ctx.fastify, "saveall_other", "StrongPass1!");
    tokenB = extractToken(loginB);

    const listRes = await createTierList(ctx.fastify, token, "Для save-all");
    listId = JSON.parse(listRes.body).data.id;

    const emptyRes = await createTierList(ctx.fastify, token, "Пустой для save-all");
    emptyListId = JSON.parse(emptyRes.body).data.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен атомарно сохранить тиры, книги и размещения", async () => {
    const beforeDetail = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${emptyListId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const defaultTierCount = JSON.parse(beforeDetail.body).data.tiers.length;

    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${emptyListId}/save-all`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        tiers: {
          added: [
            { tempId: "tier-1", title: "S", color: "#ff0000", rank: 0 },
            { tempId: "tier-2", title: "A", color: "#ff8800", rank: 1 },
          ],
        },
        newBooks: [
          { tempId: "book-1", title: "Книга 1", coverImageUrl: "https://example.com/1.jpg" },
          { tempId: "book-2", title: "Книга 2", coverImageUrl: "https://example.com/2.jpg" },
        ],
        placements: [
          { bookId: "book-1", tierId: "tier-1", rank: 0 },
          { bookId: "book-2", tierId: "tier-1", rank: 1 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.message).toBe("Saved successfully");
    expect(body.data.tierReplacements).toHaveLength(2);
    expect(body.data.bookReplacements).toHaveLength(2);

    const detailRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${emptyListId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = JSON.parse(detailRes.body).data;
    expect(detail.tiers.length).toBe(defaultTierCount + 2);
    const tierWithBooks = detail.tiers.find((t: { items: unknown[] }) => t.items.length > 0);
    expect(tierWithBooks).toBeDefined();
    expect(tierWithBooks.items).toHaveLength(2);
  });

  it("должен обновить существующие тиры", async () => {
    const detailRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const before = JSON.parse(detailRes.body).data;
    const tierIds = before.tiers.map((t: { id: number }) => t.id);

    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${listId}/save-all`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        tiers: {
          added: [{ tempId: "tier-3", title: "S", color: "#ff0000", rank: 0 }],
          updated: tierIds.slice(1).map((id: number, i: number) => ({
            id,
            title: `Обновлён ${i}`,
            color: "#00ff00",
            rank: i + 1,
          })),
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.tierReplacements).toHaveLength(1);

    const updatedRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const updated = JSON.parse(updatedRes.body).data;
    const updatedTiers = updated.tiers.filter((t: { title: string }) => t.title.startsWith("Обновлён"));
    expect(updatedTiers.length).toBeGreaterThanOrEqual(1);
  });

  it("должен удалить тиры", async () => {
    const detailRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${emptyListId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = JSON.parse(detailRes.body).data;
    const beforeCount = detail.tiers.length;
    const tierIds = detail.tiers.map((t: { id: number }) => t.id);

    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${emptyListId}/save-all`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        tiers: { deletedIds: [tierIds[0]] },
      },
    });

    expect(res.statusCode).toBe(200);

    const getRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${emptyListId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const remaining = JSON.parse(getRes.body).data.tiers;
    expect(remaining.length).toBe(beforeCount - 1);
  });

  it("должен разместить книгу без тира (unranked)", async () => {
    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${emptyListId}/save-all`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        newBooks: [
          { tempId: "book-u1", title: "Unranked", coverImageUrl: "https://example.com/u.jpg" },
        ],
        placements: [
          { bookId: "book-u1", tierId: null, rank: 0 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);

    const detailRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${emptyListId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = JSON.parse(detailRes.body).data;
    expect(detail.unrankedBooks.length).toBeGreaterThan(0);
    expect(detail.unrankedBooks[0].book.title).toBe("Unranked");
  });

  it("должен удалить книги", async () => {
    const detailRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${emptyListId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = JSON.parse(detailRes.body).data;
    const allBooks = [
      ...detail.tiers.flatMap((t: { items: any[] }) => t.items.map((i: any) => i.book)),
      ...detail.unrankedBooks.map((u: any) => u.book),
    ];
    const beforeCount = allBooks.length;

    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${emptyListId}/save-all`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        deletedBookIds: [allBooks[0].id],
      },
    });

    expect(res.statusCode).toBe(200);

    const getRes = await ctx.fastify.inject({
      method: "GET",
      url: `/api/tier-lists/${emptyListId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const remaining = JSON.parse(getRes.body).data;
    const remainingBooks = [
      ...remaining.tiers.flatMap((t: { items: any[] }) => t.items.map((i: any) => i.book)),
      ...remaining.unrankedBooks.map((u: any) => u.book),
    ];
    expect(remainingBooks.length).toBe(beforeCount - 1);
  });

  it("должен запретить save-all чужого тир-листа", async () => {
    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${listId}/save-all`,
      headers: { Authorization: `Bearer ${tokenB}` },
      payload: { tiers: { added: [{ tempId: "t-bola", title: "X", color: "#000", rank: 0 }] } },
    });

    expect(res.statusCode).toBe(403);
  });

  it("должен вернуть 403 для несуществующего тир-листа", async () => {
    const res = await ctx.fastify.inject({
      method: "PUT",
      url: "/api/tier-lists/00000000-0000-0000-0000-000000000000/save-all",
      headers: { Authorization: `Bearer ${token}` },
      payload: { tiers: { added: [{ tempId: "t-none", title: "X", color: "#000", rank: 0 }] } },
    });

    expect(res.statusCode).toBe(403);
  });
});
