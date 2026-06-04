import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Auth — verify-email / resend / forgot-password / reset-password / refresh", () => {
  let ctx: TestContext;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    ctx = await createTestServer();
    await registerUser(ctx.fastify, "authflow", "authflow@test.com", "StrongPass1!");
    const loginRes = await loginUser(ctx.fastify, "authflow", "StrongPass1!");
    token = extractToken(loginRes);

    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: "authflow@test.com" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  describe("GET /me/verification", () => {
    it("должен показать email не подтверждённым", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/auth/me/verification",
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data || JSON.parse(res.body);
      expect(data.emailVerified).toBe(false);
      expect(data.email).toBe("authflow@test.com");
    });

    it("должен вернуть 401 без токена", async () => {
      const res = await ctx.fastify.inject({
        method: "GET",
        url: "/api/auth/me/verification",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /resend-verification", () => {
    it("должен вернуть 200 для существующего email", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/resend-verification",
        payload: { email: "authflow@test.com" },
      });

      expect(res.statusCode).toBe(200);
    });

    it("должен вернуть 200 для несуществующего email", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/resend-verification",
        payload: { email: "nonexistent@test.com" },
      });

      expect(res.statusCode).toBe(200);
    });

    it("должен обновить токен верификации", async () => {
      const before = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      const oldToken = before.emailVerificationToken;
      expect(oldToken).not.toBeNull();

      await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/resend-verification",
        payload: { email: "authflow@test.com" },
      });

      const after = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(after.emailVerificationToken).not.toBe(oldToken);
      expect(after.emailVerificationToken).not.toBeNull();
    });
  });

  describe("POST /verify-email", () => {
    it("должен подтвердить email с валидным токеном", async () => {
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      const verifyToken = user.emailVerificationToken!;

      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/verify-email",
        payload: { token: verifyToken },
      });

      expect(res.statusCode).toBe(200);

      const updated = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(updated.emailVerifiedAt).not.toBeNull();
    });

    it("должен вернуть 400 с невалидным токеном", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/verify-email",
        payload: { token: "invalid-token-123" },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /refresh", () => {
    it("должен обновить токен через refreshToken cookie", async () => {
      const loginRes = await loginUser(ctx.fastify, "authflow", "StrongPass1!");
      const cookies = loginRes.cookies;
      const refreshCookie = cookies.find((c: { name: string }) => c.name === "refreshToken");
      expect(refreshCookie).toBeDefined();

      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/refresh",
        cookies: { refreshToken: refreshCookie!.value },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body).data || JSON.parse(res.body);
      expect(data.accessToken).toBeTruthy();
    });

    it("должен вернуть 401 без refreshToken", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/refresh",
      });

      expect(res.statusCode).toBe(401);
    });

    it("должен вернуть 401 с невалидным refreshToken", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/refresh",
        cookies: { refreshToken: "invalid-refresh-token" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /forgot-password", () => {
    it("должен вернуть 200 для несуществующего email", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/forgot-password",
        payload: { email: "nobody@nowhere.com" },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("POST /reset-password", () => {
    let resetToken: string;

    beforeAll(async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const created = await ctx.prisma.passwordResetToken.create({
        data: {
          token: "test-reset-token-123",
          userId,
          expiresAt,
        },
      });
      resetToken = created.token;
    });

    it("должен сбросить пароль с валидным токеном", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/reset-password",
        payload: { token: resetToken, password: "NewPass123!" },
      });

      expect(res.statusCode).toBe(200);
    });

    it("должен залогиниться с новым паролем", async () => {
      const res = await loginUser(ctx.fastify, "authflow", "NewPass123!");
      expect(res.statusCode).toBe(200);
    });

    it("должен вернуть 400 с повторным использованием токена", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/reset-password",
        payload: { token: resetToken, password: "Another123!" },
      });

      expect(res.statusCode).toBe(400);
    });

    it("должен вернуть 400 с невалидным токеном", async () => {
      const res = await ctx.fastify.inject({
        method: "POST",
        url: "/api/auth/reset-password",
        payload: { token: "invalid-token", password: "NewPass123!" },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
