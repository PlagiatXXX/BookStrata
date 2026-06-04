import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Templates", () => {
  let ctx: TestContext;
  let userToken: string;
  let createdTemplateId: string;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "curator_joe", "tmpl_user@test.com", "StrongPass1!");
    const userLogin = await loginUser(ctx.fastify, "curator_joe", "StrongPass1!");
    userToken = extractToken(userLogin);
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("GET /api/templates — returns empty array initially", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/templates",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("POST /api/templates — creates a template with title and 3 tiers", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/templates",
      headers: { Authorization: `Bearer ${userToken}` },
      payload: {
        title: "My Reading Tier List",
        tiers: [
          { id: "s", name: "S-Tier", color: "#FF4444", order: 0 },
          { id: "a", name: "A-Tier", color: "#FF8844", order: 1 },
          { id: "b", name: "B-Tier", color: "#FFCC44", order: 2 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.title).toBe("My Reading Tier List");
    expect(body.tiers).toHaveLength(3);
    createdTemplateId = body.id;
  });

  it("GET /api/templates — returns the created template", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/templates",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(createdTemplateId);
    expect(body[0].title).toBe("My Reading Tier List");
  });

  it("GET /api/templates/:id — returns the specific template", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/templates/${createdTemplateId}`,
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(createdTemplateId);
    expect(body.title).toBe("My Reading Tier List");
    expect(body.tiers).toHaveLength(3);
  });

  it("DELETE /api/templates/:id — deletes template, returns 204", async () => {
    const res = await ctx.fastify.inject({
      method: "DELETE",
      url: `/api/templates/${createdTemplateId}`,
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(204);
  });

  it("GET /api/templates/:id — returns 404 after deletion", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/templates/${createdTemplateId}`,
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toBeDefined();
  });
});
