import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Avatar + Admin", () => {
  let ctx: TestContext;
  let token: string;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestServer();

    // Обычный пользователь
    await registerUser(ctx.fastify, "avataruser", "avatar@test.com", "StrongPass1!");
    const login = await loginUser(ctx.fastify, "avataruser", "StrongPass1!");
    token = extractToken(login);

    // Админ
    await registerUser(ctx.fastify, "sysop_joe", "admin@test.com", "StrongPass1!");
    const adminLogin = await loginUser(ctx.fastify, "sysop_joe", "StrongPass1!");
    adminToken = extractToken(adminLogin);

    const adminRole = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    const adminUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "admin@test.com" } });
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

  describe("PUT /api/users/me/avatar", () => {
    it("должен установить аватар", async () => {
      const res = await ctx.fastify.inject({
        method: "PUT",
        url: "/api/users/me/avatar",
        headers: { Authorization: `Bearer ${token}` },
        payload: { avatarUrl: "https://example.com/avatar.jpg" },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.avatarUrl).toBe("https://example.com/avatar.jpg");
    });

    it("должен вернуть 401 без токена", async () => {
      const res = await ctx.fastify.inject({
        method: "PUT",
        url: "/api/users/me/avatar",
        payload: { avatarUrl: "https://example.com/avatar.jpg" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("DELETE /api/users/me/avatar", () => {
    it("должен удалить аватар", async () => {
      const res = await ctx.fastify.inject({
        method: "DELETE",
        url: "/api/users/me/avatar",
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.avatarUrl).toBeNull();
    });

    it("должен вернуть 401 без токена", async () => {
      const res = await ctx.fastify.inject({
        method: "DELETE",
        url: "/api/users/me/avatar",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/users/admin/all", () => {
    it("должен вернуть список пользователей для админа", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/users/admin/all",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);
    });

    it("должен вернуть 403 для обычного пользователя", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/users/admin/all",
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/users/admin/violators", () => {
    it("должен вернуть пустой список нарушителей", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/users/admin/violators",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(Array.isArray(data)).toBe(true);
    });

    it("должен вернуть 403 для обычного пользователя", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/users/admin/violators",
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("PATCH /api/users/admin/:id/donor", () => {
    it("должен установить статус мецената", async () => {
      const targetUser = await ctx.prisma.user.findUniqueOrThrow({
        where: { email: "avatar@test.com" },
      });

      const res = await ctx.fastify.inject({
        method: "PATCH",
        url: `/api/users/admin/${targetUser.id}/donor`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { isDonor: true },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.isDonor).toBe(true);
    });

    it("должен снять статус мецената", async () => {
      const targetUser = await ctx.prisma.user.findUniqueOrThrow({
        where: { email: "avatar@test.com" },
      });

      const res = await ctx.fastify.inject({
        method: "PATCH",
        url: `/api/users/admin/${targetUser.id}/donor`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { isDonor: false },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data;
      expect(data.isDonor).toBe(false);
    });

    it("должен вернуть 403 для обычного пользователя", async () => {
      const targetUser = await ctx.prisma.user.findUniqueOrThrow({
        where: { email: "avatar@test.com" },
      });

      const res = await ctx.fastify.inject({
        method: "PATCH",
        url: `/api/users/admin/${targetUser.id}/donor`,
        headers: { Authorization: `Bearer ${token}` },
        payload: { isDonor: true },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
