import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Achievements", () => {
  let ctx: TestContext;
  let token: string;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "achv_player", "achv@test.com", "StrongPass1!");
    const login = await loginUser(ctx.fastify, "achv_player", "StrongPass1!");
    token = extractToken(login);
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/achievements/status — возвращает xp и title", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/achievements/status",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveProperty("xp");
    expect(body.data).toHaveProperty("title");
  });

  it("GET /api/achievements/me — возвращает список достижений", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/achievements/me",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/achievements/seed — сидирует достижения", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/achievements/seed",
    });

    expect(res.statusCode).toBe(200);
  });

  it("GET /api/achievements/me без токена — возвращает 401", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/achievements/me",
    });

    expect(res.statusCode).toBe(401);
  });
});
