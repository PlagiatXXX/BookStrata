import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Forum", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestServer();
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/forum/stats — возвращает статистику форума", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/forum/stats",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("data");
  });
});
