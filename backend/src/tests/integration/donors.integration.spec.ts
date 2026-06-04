import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Donors CRUD", () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let donorId: number;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "donor_handler", "donor-admin@test.com", "StrongPass1!");
    const adminLogin = await loginUser(ctx.fastify, "donor_handler", "StrongPass1!");
    adminToken = extractToken(adminLogin);

    const adminRole = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    await ctx.prisma.user.update({
      where: { email: "donor-admin@test.com" },
      data: { roleId: adminRole.id },
    });

    await registerUser(ctx.fastify, "regular_user", "regular-donor@test.com", "StrongPass1!");
    const userLogin = await loginUser(ctx.fastify, "regular_user", "StrongPass1!");
    userToken = extractToken(userLogin);
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/donors — returns empty array initially", async () => {
    const res = await ctx.fastify.inject({ method: "GET", url: "/api/donors" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it("POST /api/donors as admin — creates donor → 201", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/donors",
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: "Test Donor" },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(data.name).toBe("Test Donor");
    expect(data.id).toBeGreaterThan(0);
    donorId = data.id;
  });

  it("GET /api/donors — returns the donor", async () => {
    const res = await ctx.fastify.inject({ method: "GET", url: "/api/donors" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(donorId);
    expect(data[0].name).toBe("Test Donor");
  });

  it("DELETE /api/donors/:id as admin → 204", async () => {
    const res = await ctx.fastify.inject({
      method: "DELETE",
      url: `/api/donors/${donorId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it("POST /api/donors as regular user → 403", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/donors",
      headers: { Authorization: `Bearer ${userToken}` },
      payload: { name: "Should Fail" },
    });
    expect(res.statusCode).toBe(403);
  });
});
