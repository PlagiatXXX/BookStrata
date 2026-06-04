import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Feedback API", () => {
  let ctx: TestContext;
  let userToken: string;
  let adminToken: string;
  let anonymousFeedbackId: number;
  let userFeedbackId: number;

  beforeAll(async () => {
    ctx = await createTestServer();

    // Regular user
    await registerUser(ctx.fastify, "fb_user", "fb_user@test.com", "StrongPass1!");
    const userLogin = await loginUser(ctx.fastify, "fb_user", "StrongPass1!");
    userToken = extractToken(userLogin);

    // Admin user
    await registerUser(ctx.fastify, "fb_handler", "fb_admin@test.com", "StrongPass1!");
    const adminLogin = await loginUser(ctx.fastify, "fb_handler", "StrongPass1!");
    adminToken = extractToken(adminLogin);

    const adminRole = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    const adminUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "fb_admin@test.com" } });
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

  it("POST /api/feedback as anonymous — creates feedback", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/feedback",
      payload: {
        type: "bug",
        message: "Found a bug in the UI",
        pageUrl: "/tier-lists",
        userEmail: "anon@example.com",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.type).toBe("bug");
    expect(body.data.message).toBe("Found a bug in the UI");
    expect(body.data.pageUrl).toBe("/tier-lists");
    expect(body.data.userEmail).toBe("anon@example.com");
    expect(body.data.userId).toBeNull();
    anonymousFeedbackId = body.data.id;
  });

  it("POST /api/feedback as logged-in user — creates feedback", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/feedback",
      headers: { Authorization: `Bearer ${userToken}` },
      payload: {
        type: "feature",
        message: "I want a dark mode",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.type).toBe("feature");
    expect(body.data.message).toBe("I want a dark mode");
    expect(body.data.userId).toBeTruthy();
    userFeedbackId = body.data.id;
  });

  it("GET /api/feedback as admin — returns feedback list", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/feedback",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(2);
  });

  it("GET /api/feedback as regular user — returns 403", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/feedback",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("PATCH /api/feedback/:id as admin — changes status to done", async () => {
    const res = await ctx.fastify.inject({
      method: "PATCH",
      url: `/api/feedback/${anonymousFeedbackId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { status: "done" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe("done");
  });

  it("DELETE /api/feedback/:id as admin — deletes feedback", async () => {
    const res = await ctx.fastify.inject({
      method: "DELETE",
      url: `/api/feedback/${anonymousFeedbackId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(204);
  });

  it("GET /api/feedback as admin — only one feedback remains after delete", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/feedback",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(userFeedbackId);
  });
});
