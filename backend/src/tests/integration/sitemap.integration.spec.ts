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

    const body = res.body;
    expect(body).toContain('<?xml version="1.0"');
    expect(body).toContain("<urlset");
    // В тестовом окружении CLIENT_URL не задан — fallback до localhost
    expect(body).toMatch(/<loc>https?:\/\/[^<]+\/<\/loc>/);
    expect(body).toContain("<priority>1.0</priority>");
    expect(body).toContain("<changefreq>weekly</changefreq>");
    expect(body).toContain("</urlset>");
    expect(body).not.toContain("[object Object]");
  });
});
