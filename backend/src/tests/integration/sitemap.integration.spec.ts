import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Sitemap", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestServer();
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /sitemap.xml — returns 200 with XML content type", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/sitemap.xml",
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/xml/);
  });
});
