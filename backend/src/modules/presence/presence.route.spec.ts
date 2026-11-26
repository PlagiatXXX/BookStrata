import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, reply: any, done: any) => {
    const authHeader = request.headers.authorization;
    if (authHeader === "Bearer admin-token") {
      request.user = { userId: 1, username: "admin", role: "admin" };
      done();
    } else if (authHeader === "Bearer user-token") {
      request.user = { userId: 2, username: "user", role: "user" };
      done();
    } else {
      reply.code(401).send({ error: { code: "unauthorized", message: "Необходима авторизация" } });
    }
  }),
}));

vi.mock("../../middleware/requireRole.js", () => ({
  requireRole: (...roles: string[]) => {
    return (request: any, reply: any, done: any) => {
      if (roles.includes(request.user?.role)) {
        done();
      } else {
        reply.code(403).send({ error: { code: "forbidden", message: "Нет прав доступа" } });
      }
    };
  },
}));

const mockPresenceService = {
  ping: vi.fn().mockResolvedValue({ ok: true }),
  leave: vi.fn().mockResolvedValue({ ok: true }),
  getOnlineSnapshot: vi.fn().mockResolvedValue({
    totalOnline: 2,
    authCount: 1,
    guestCount: 1,
    activeCount: 2,
    idleCount: 0,
    users: [],
    guestsByPage: [],
    guestsByDevice: [],
    updatedAt: "2026-11-27T00:00:00.000Z",
  }),
};

vi.mock("./presence.service.js", () => ({
  createPresenceService: () => mockPresenceService,
}));

vi.mock("../../lib/redis.js", () => ({
  redis: {},
}));

import { presenceRoutes, adminPresenceRoutes } from "./presence.route.js";

describe("Presence Routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });
    app.decorate("prisma", {} as any);
    await app.register(presenceRoutes, { prefix: "/api/presence" });
    await app.register(adminPresenceRoutes, { prefix: "/api/admin/presence" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST /api/presence/ping принимает валидный пинг", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/presence/ping",
      payload: { anonId: "anon_123", page: "/books/dune", status: "active" },
    });

    expect(res.statusCode).toBe(202);
    expect(mockPresenceService.ping).toHaveBeenCalledWith(
      expect.objectContaining({
        anonId: "anon_123",
        page: "/books/dune",
        status: "active",
      }),
    );
  });

  it("POST /api/presence/ping отклоняет невалидный статус", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/presence/ping",
      payload: { anonId: "anon_123", page: "/", status: "invalid" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/presence/leave принимает text/plain от sendBeacon", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/presence/leave",
      headers: { "content-type": "text/plain" },
      payload: JSON.stringify({ anonId: "anon_123" }),
    });
    expect(res.statusCode).toBe(202);
    expect(mockPresenceService.leave).toHaveBeenCalledWith(
      expect.objectContaining({ anonId: "anon_123" }),
    );
  });

  it("GET /api/admin/presence/online запрещён обычным пользователям (403) и открыт админу (200)", async () => {
    const userRes = await app.inject({
      method: "GET",
      url: "/api/admin/presence/online",
      headers: { authorization: "Bearer user-token" },
    });
    expect(userRes.statusCode).toBe(403);

    const adminRes = await app.inject({
      method: "GET",
      url: "/api/admin/presence/online",
      headers: { authorization: "Bearer admin-token" },
    });
    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.json()).toMatchObject({
      data: { totalOnline: 2, authCount: 1, guestCount: 1 },
    });
  });
});
