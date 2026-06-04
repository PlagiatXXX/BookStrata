import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("External News", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestServer();
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/external-news — returns 200 (may be empty if external fetch fails)", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/external-news?limit=3",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });
});
