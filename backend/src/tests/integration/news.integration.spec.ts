import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("News", () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let createdArticleId: number;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "news_curator", "news_admin@test.com", "StrongPass1!");
    const adminLogin = await loginUser(ctx.fastify, "news_curator", "StrongPass1!");
    adminToken = extractToken(adminLogin);

    const adminRole = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    const adminUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "news_admin@test.com" } });
    await ctx.prisma.user.update({
      where: { id: adminUser.id },
      data: { roleId: adminRole.id },
    });

    await registerUser(ctx.fastify, "news_reader", "news_user@test.com", "StrongPass1!");
    const userLogin = await loginUser(ctx.fastify, "news_reader", "StrongPass1!");
    userToken = extractToken(userLogin);
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/news — возвращает пустой список", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/news",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(0);
  });

  it("POST /api/news as admin — создаёт новость", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/news",
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Test News Article",
        content: "This is a test news article content with enough length.",
        excerpt: "Short summary",
      },
    });

    expect(res.statusCode).toBe(201);
  });

  it("GET /api/news — возвращает созданную новость (админ видит всё)", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/news",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    createdArticleId = body.data[0].id;
    expect(body.data[0].title).toBe("Test News Article");
    expect(body.meta).toBeDefined();
    expect(body.links).toBeDefined();
  });

  it("POST /api/news/:id/publish — публикует новость", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: `/api/news/${createdArticleId}/publish`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { isPublished: true },
    });

    expect(res.statusCode).toBe(200);
  });

  it("GET /api/news/published — возвращает опубликованную новость", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/news/published",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(createdArticleId);
  });

  it("GET /api/news/:id — возвращает конкретную новость", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/news/${createdArticleId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBe(createdArticleId);
    expect(body.data.title).toBe("Test News Article");
  });

  it("DELETE /api/news/:id as admin — удаляет новость", async () => {
    const res = await ctx.fastify.inject({
      method: "DELETE",
      url: `/api/news/${createdArticleId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("POST /api/news as regular user — возвращает 403", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/news",
      headers: { Authorization: `Bearer ${userToken}` },
      payload: {
        title: "Unauthorized News",
        content: "Should not be created",
      },
    });

    expect(res.statusCode).toBe(403);
  });
});
