import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Roles", () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let targetUserId: number;

  beforeAll(async () => {
    ctx = await createTestServer();

    // Убираем секрет смены ролей, если он задан в окружении
    delete process.env.ADMIN_ROLE_CHANGE_SECRET;

    await registerUser(ctx.fastify, "role_overseer", "roles-admin@test.com", "StrongPass1!");
    const adminLogin = await loginUser(ctx.fastify, "role_overseer", "StrongPass1!");
    adminToken = extractToken(adminLogin);

    const adminRole = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    await ctx.prisma.user.update({
      where: { email: "roles-admin@test.com" },
      data: { roleId: adminRole.id },
    });

    await registerUser(ctx.fastify, "subs_manager", "target@test.com", "StrongPass1!");
    const targetUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: "target@test.com" },
    });
    targetUserId = targetUser.id;

    await registerUser(ctx.fastify, "regular_user", "regular-roles@test.com", "StrongPass1!");
    const userLogin = await loginUser(ctx.fastify, "regular_user", "StrongPass1!");
    userToken = extractToken(userLogin);
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/roles as admin — returns roles list", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/roles",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(3);
    const names = data.map((r: { name: string }) => r.name);
    expect(names).toContain("admin");
    expect(names).toContain("moderator");
    expect(names).toContain("user");
  });

  it("GET /api/roles/me — returns the role for the current user", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/roles/me",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(data.name).toBe("admin");
  });

  it("GET /api/roles as regular user → 403", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/roles",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("PUT /api/roles/user/:userId as admin — change user role", async () => {
    const res = await ctx.fastify.inject({
      method: "PUT",
      url: `/api/roles/user/${targetUserId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { role: "moderator", password: "StrongPass1!" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(data.success).toBe(true);
    expect(data.role.name).toBe("moderator");
  });
});
