import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Subscriptions", () => {
  let ctx: TestContext;
  let userToken: string;
  let adminToken: string;
  let regularUserId: number;

  beforeAll(async () => {
    ctx = await createTestServer();

    // Регистрация авто-активирует 7-дневный Pro-триал
    await registerUser(ctx.fastify, "book_fan", "subs_user@test.com", "StrongPass1!");
    const userLogin = await loginUser(ctx.fastify, "book_fan", "StrongPass1!");
    userToken = extractToken(userLogin);

    const userData = JSON.parse((await ctx.fastify.inject({
      method: "GET",
      url: "/api/users/me",
      headers: { Authorization: `Bearer ${userToken}` },
    })).body);
    regularUserId = userData.data?.id ?? userData.id;

    // Админ
    await registerUser(ctx.fastify, "tier_master", "subs_admin@test.com", "StrongPass1!");
    const adminLogin = await loginUser(ctx.fastify, "tier_master", "StrongPass1!");
    adminToken = extractToken(adminLogin);

    const adminRole = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    await ctx.prisma.user.update({
      where: { email: "subs_admin@test.com" },
      data: { roleId: adminRole.id },
    });
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/subscriptions/me — новый пользователь получает Pro-триал", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/subscriptions/me",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data ?? body;
    expect(data.isPro).toBe(true);
    expect(data.proExpiresAt).toBeTruthy();
  });

  it("POST /api/subscriptions/set-status as admin — деактивирует Pro", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/subscriptions/set-status",
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { userId: regularUserId, isPro: false },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data ?? body;
    expect(data.isPro).toBe(false);
    expect(data.userId).toBe(regularUserId);
  });

  it("GET /api/subscriptions/me — теперь isPro=false", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/subscriptions/me",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data ?? body;
    expect(data.isPro).toBe(false);
  });

  it("POST /api/subscriptions/set-status as regular user — возвращает 403", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/subscriptions/set-status",
      headers: { Authorization: `Bearer ${userToken}` },
      payload: { userId: regularUserId, isPro: true },
    });

    expect(res.statusCode).toBe(403);
  });
});
