import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Admin endpoints", () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "simple_player", "admin_reg@test.com", "StrongPass1!");
    const userLogin = await loginUser(ctx.fastify, "simple_player", "StrongPass1!");
    userToken = extractToken(userLogin);

    await registerUser(ctx.fastify, "operator_max", "admin_stats@test.com", "StrongPass1!");
    const adminLogin = await loginUser(ctx.fastify, "operator_max", "StrongPass1!");
    adminToken = extractToken(adminLogin);

    const adminRole = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    const adminUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "admin_stats@test.com" } });
    await ctx.prisma.user.update({
      where: { id: adminUser.id },
      data: { roleId: adminRole.id },
    });
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/admin/stats as admin — returns stats", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/admin/stats",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data ?? body;
    expect(data).toHaveProperty("totalUsers");
    expect(data).toHaveProperty("proUsers");
    expect(data).toHaveProperty("tierLists");
    expect(typeof data.totalUsers).toBe("number");
  });

  it("GET /api/admin/stats as regular user — returns 403", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/admin/stats",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("POST /api/admin/cleanup-load-test as admin — returns result", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/admin/cleanup-load-test",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data ?? body;
    expect(data).toHaveProperty("deleted");
    expect(data).toHaveProperty("orphanedBooks");
    expect(data).toHaveProperty("usernames");
    expect(data).toHaveProperty("templatesDeleted");
    expect(data.deleted).toBe(0);
  });
});
