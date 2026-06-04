import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList } from "./helpers.js";

import type { TestContext } from "./helpers.js";

describe("Каскадное удаление пользователя", () => {
  let ctx: TestContext;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    ctx = await createTestServer();
    await registerUser(ctx.fastify, "cascadeuser", "cascade@test.com", "StrongPass1!");
    const loginRes = await loginUser(ctx.fastify, "cascadeuser", "StrongPass1!");
    token = extractToken(loginRes);

    const createRes = await createTierList(ctx.fastify, token, "Каскадный список");
    const listId = JSON.parse(createRes.body).data.id;

    await ctx.fastify.inject({
      method: "PUT",
      url: `/api/tier-lists/${listId}/tiers`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { added: [{ title: "S", color: "#ff0000", rank: 0 }] },
    });

    await ctx.fastify.inject({
      method: "POST",
      url: `/api/tier-lists/${listId}/books`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        books: [{ title: "Книга для каскада", coverImageUrl: "https://example.com/cover.jpg" }],
      },
    });

    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: "cascade@test.com" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен удалить все тир-листы, тиры и книги при удалении пользователя", async () => {
    await ctx.prisma.user.delete({ where: { id: userId } });

    const tierLists = await ctx.prisma.tierList.findMany({ where: { userId } });
    expect(tierLists.length).toBe(0);

    const tiers = await ctx.prisma.tier.findMany({
      where: { tierList: { userId } },
    });
    expect(tiers.length).toBe(0);

    const placements = await ctx.prisma.bookPlacement.findMany({
      where: { tierList: { userId } },
    });
    expect(placements.length).toBe(0);

    const books = await ctx.prisma.book.findMany({
      where: { placements: { some: { tierList: { userId } } } },
    });
    expect(books.length).toBe(0);
  });
});
