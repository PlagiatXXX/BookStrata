import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, createTierList } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Battles API", () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let adminTierListIds: string[];
  let createdBattleId: string;

  beforeAll(async () => {
    ctx = await createTestServer();

    // Admin user
    await registerUser(ctx.fastify, "battle_chief", "battle_admin@test.com", "StrongPass1!");
    const adminLogin = await loginUser(ctx.fastify, "battle_chief", "StrongPass1!");
    adminToken = extractToken(adminLogin);

    const adminRole = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    const adminUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "battle_admin@test.com" } });
    await ctx.prisma.user.update({
      where: { id: adminUser.id },
      data: { roleId: adminRole.id },
    });

    // Regular user
    await registerUser(ctx.fastify, "battle_user", "battle_user@test.com", "StrongPass1!");
    const userLogin = await loginUser(ctx.fastify, "battle_user", "StrongPass1!");
    userToken = extractToken(userLogin);

    // Create 2 tier lists for admin (required by participantTierListIds)
    const tl1Res = await createTierList(ctx.fastify, adminToken, "Battle TL 1");
    const tl2Res = await createTierList(ctx.fastify, adminToken, "Battle TL 2");
    adminTierListIds = [
      JSON.parse(tl1Res.body).data.id,
      JSON.parse(tl2Res.body).data.id,
    ];

    // Make tier lists public (battle requires public participants)
    for (const id of adminTierListIds) {
      await ctx.fastify.inject({
        method: "PUT",
        url: `/api/tier-lists/${id}/public`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { isPublic: true },
      });
    }
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/battles — returns empty array initially", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/battles",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toEqual([]);
  });

  it("POST /api/battles as admin — creates a battle", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/battles",
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Test Battle",
        description: "A test battle",
        type: "weekly",
        endTime: futureDate,
        participantTierListIds: adminTierListIds,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe("Test Battle");
    expect(body.data.description).toBe("A test battle");
    expect(body.data.type).toBe("weekly");
    expect(body.data.status).toBe("active");
    createdBattleId = body.data.id;
  });

  it("GET /api/battles — returns the created battle", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/battles",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(createdBattleId);
    expect(body.data[0].title).toBe("Test Battle");
  });

  it("GET /api/battles/:id — returns the specific battle", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/battles/${createdBattleId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBe(createdBattleId);
    expect(body.data.title).toBe("Test Battle");
    expect(body.data.description).toBe("A test battle");
  });

  it("GET /api/battles/:id — returns 404 for non-existent battle", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/battles/00000000-0000-0000-0000-000000000000",
    });

    expect(res.statusCode).toBe(404);
  });

  it("POST /api/battles as regular user — returns 403", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/battles",
      headers: { Authorization: `Bearer ${userToken}` },
      payload: {
        title: "Unauthorized Battle",
        type: "weekly",
        endTime: futureDate,
        participantTierListIds: adminTierListIds,
      },
    });

    expect(res.statusCode).toBe(403);
  });
});
