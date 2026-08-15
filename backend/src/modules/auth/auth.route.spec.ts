// backend/src/modules/auth/auth.route.spec.ts
// CSRF defense-in-depth на /api/auth/refresh:
//   - запрос с чужого Origin/Referer → 403, refresh не выполняется,
//   - запрос со своего Origin (config.CLIENT_URL) + валидная cookie → 200,
//   - запрос без Origin/Referer (curl, prerender, server-to-server) → пропускается,
//   - без cookie → штатный 401.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";

const mocks = vi.hoisted(() => ({
  config: {
    NODE_ENV: "test",
    JWT_SECRET: "test-secret",
    CLIENT_URL: "https://bookstrata.ru",
    RATE_LIMIT_REGISTER_MAX: 300,
    RATE_LIMIT_LOGIN_MAX: 20,
    RATE_LIMIT_REFRESH_MAX: 60,
  },
  authService: {
    register: vi.fn(),
    login: vi.fn(),
  },
  tokenService: {
    validateToken: vi.fn(),
    validateRefreshToken: vi.fn(),
    generateTokenPair: vi.fn(),
    logout: vi.fn(),
  },
  passwordResetService: {
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  },
  oauthService: {
    oauthVk: vi.fn(),
    oauthGoogle: vi.fn(),
  },
  authMiddleware: vi.fn(),
  prisma: {},
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks.prisma }));
vi.mock("../../config/env.js", () => ({ config: mocks.config }));
vi.mock("./auth.service.js", () => mocks.authService);
vi.mock("./token.service.js", () => mocks.tokenService);
vi.mock("./password-reset.service.js", () => mocks.passwordResetService);
vi.mock("./oauth.service.js", () => mocks.oauthService);
vi.mock("./auth.middleware.js", () => ({ authMiddleware: mocks.authMiddleware }));

import { authRoutes } from "./auth.route.js";

describe("POST /api/auth/refresh — Origin/Referer check (CSRF defense-in-depth)", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    await instance.register(cookie, { secret: "test-secret" });
    await instance.register(authRoutes, { prefix: "/api/auth" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.tokenService.validateRefreshToken.mockResolvedValue({
      userId: 1,
      username: "testuser",
      role: "user",
    });
    mocks.tokenService.generateTokenPair.mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  it("чужой Origin → 403, refresh-токен не валидируется", async () => {
    const res = await request(app.server)
      .post("/api/auth/refresh")
      .set("Origin", "https://evil.example.com");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
    expect(mocks.tokenService.validateRefreshToken).not.toHaveBeenCalled();
  });

  it("чужой Referer → 403, refresh-токен не валидируется", async () => {
    const res = await request(app.server)
      .post("/api/auth/refresh")
      .set("Referer", "https://evil.example.com/hack-page");

    expect(res.status).toBe(403);
    expect(mocks.tokenService.validateRefreshToken).not.toHaveBeenCalled();
  });

  it("чужой Origin срабатывает даже при наличии валидной cookie", async () => {
    const res = await request(app.server)
      .post("/api/auth/refresh")
      .set("Origin", "https://evil.example.com")
      .set("Cookie", "refreshToken=valid-token");

    expect(res.status).toBe(403);
    expect(mocks.tokenService.validateRefreshToken).not.toHaveBeenCalled();
  });

  it("свой Origin + валидная cookie → 200 с новым accessToken", async () => {
    const res = await request(app.server)
      .post("/api/auth/refresh")
      .set("Origin", "https://bookstrata.ru")
      .set("Cookie", "refreshToken=valid-token");

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBe("new-access-token");
    expect(mocks.tokenService.validateRefreshToken).toHaveBeenCalledWith("valid-token");
    expect(mocks.tokenService.generateTokenPair).toHaveBeenCalledWith({
      userId: 1,
      username: "testuser",
      role: "user",
    });
  });

  it("свой Origin с траiling slash (нормализация через new URL) → 200", async () => {
    const res = await request(app.server)
      .post("/api/auth/refresh")
      .set("Origin", "https://bookstrata.ru/")
      .set("Cookie", "refreshToken=valid-token");

    expect(res.status).toBe(200);
  });

  it("без Origin и Referer (server-to-server, prerender) → запрос пропускается", async () => {
    const res = await request(app.server)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=valid-token");

    expect(res.status).toBe(200);
    expect(mocks.tokenService.validateRefreshToken).toHaveBeenCalledWith("valid-token");
  });

  it("свой Origin без cookie → штатный 401 (токен не найден)", async () => {
    const res = await request(app.server)
      .post("/api/auth/refresh")
      .set("Origin", "https://bookstrata.ru");

    expect(res.status).toBe(401);
  });
});
