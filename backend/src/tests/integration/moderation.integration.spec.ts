import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Moderation", () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let targetUserId: number;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "chief_overseer", "mod-admin@test.com", "StrongPass1!");
    const adminLogin = await loginUser(ctx.fastify, "chief_overseer", "StrongPass1!");
    adminToken = extractToken(adminLogin);

    const adminRole = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    await ctx.prisma.user.update({
      where: { email: "mod-admin@test.com" },
      data: { roleId: adminRole.id },
    });

    await registerUser(ctx.fastify, "offender_user", "offender@test.com", "StrongPass1!");
    const targetUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: "offender@test.com" },
    });
    targetUserId = targetUser.id;

    await registerUser(ctx.fastify, "report_handler", "reporter@test.com", "StrongPass1!");
    const userLogin = await loginUser(ctx.fastify, "report_handler", "StrongPass1!");
    userToken = extractToken(userLogin);
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/moderation/users/:id/moderation as admin — returns user status", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/moderation/users/${targetUserId}/moderation`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(data.id).toBe(targetUserId);
    expect(data.username).toBe("offender_user");
    expect(data.role).toBe("user");
    expect(typeof data.chatBanned).toBe("boolean");
    expect(typeof data.suspended).toBe("boolean");
    expect(typeof data.warningsCount).toBe("number");
  });

  it("POST /api/moderation/users/:id/warn as admin — warn a user → 200", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: `/api/moderation/users/${targetUserId}/warn`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { message: "Test warning message" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(data.message).toBe("Test warning message");
    expect(data.id).toBeGreaterThan(0);
  });

  it("GET /api/moderation/users/:id/warnings as admin — returns warnings", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/moderation/users/${targetUserId}/warnings`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].message).toBe("Test warning message");
  });

  it("POST /api/moderation/flags — create a content flag → 201", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/moderation/flags",
      headers: { Authorization: `Bearer ${userToken}` },
      payload: {
        imageUrl: "https://example.com/flag.jpg",
        flagType: "avatar",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(data.imageUrl).toBe("https://example.com/flag.jpg");
    expect(data.flagType).toBe("avatar");
    expect(data.status).toBe("pending");
  });

  it("GET /api/moderation/flags as admin — returns flags", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/moderation/flags",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(data.flags).toBeDefined();
    expect(Array.isArray(data.flags)).toBe(true);
    expect(data.flags.length).toBeGreaterThanOrEqual(1);
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/moderation/users/:id/warn as regular user → 403", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: `/api/moderation/users/${targetUserId}/warn`,
      headers: { Authorization: `Bearer ${userToken}` },
      payload: { message: "Should not work" },
    });
    expect(res.statusCode).toBe(403);
  });
});
