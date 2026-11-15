import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    supportThread: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    supportMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { prisma: tx };
});

vi.mock("../../lib/telegramNotifier.js", () => ({
  sendTelegramSupportNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, _reply: any, done: any) => {
    const authHeader = request.headers.authorization;
    if (authHeader === "Bearer admin-token") {
      request.user = { userId: 1, username: "admin", role: "admin" };
    } else if (authHeader === "Bearer user-token") {
      request.user = { userId: 2, username: "user", role: "user" };
    }
    done();
  }),
}));

vi.mock("../../middleware/requireRole.js", () => ({
  requireRole: (...roles: string[]) => {
    return (request: any, _reply: any, done: any) => {
      if (roles.includes(request.user?.role)) {
        done();
      } else {
        _reply.code(403).send({ error: { code: "forbidden", message: "Нет прав доступа" } });
      }
    };
  },
}));

import { supportRoutes, adminSupportRoutes } from "./support.route.js";
import { prisma } from "../../lib/prisma.js";

describe("Support Routes", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    const { prisma: prismaMock } = await import("../../lib/prisma.js");
    instance.decorate("prisma", prismaMock);

    instance.addHook("onRequest", async (request: any) => {
      const authHeader = request.headers.authorization;
      if (authHeader === "Bearer admin-token") {
        request.user = { userId: 1, username: "admin", role: "admin" };
      } else if (authHeader === "Bearer user-token") {
        request.user = { userId: 2, username: "user", role: "user" };
      }
    });

    await instance.register(supportRoutes, { prefix: "/api/support" });
    await instance.register(adminSupportRoutes, { prefix: "/api/admin/support" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  describe("GET /api/support/thread", () => {
    it("returns null if neither user nor guest token provided", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/support/thread",
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ data: null });
    });

    it("returns thread for logged in user", async () => {
      vi.mocked(prisma.supportThread.findFirst).mockResolvedValue({
        id: 10,
        userId: 2,
        messages: [{ id: 1, text: "Вопрос" }],
      } as any);

      const res = await app.inject({
        method: "GET",
        url: "/api/support/thread",
        headers: { authorization: "Bearer user-token" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBe(10);
    });

    it("returns thread for guest using x-guest-token header", async () => {
      vi.mocked(prisma.supportThread.findFirst).mockResolvedValue({
        id: 11,
        guestToken: "guest-abc",
        messages: [],
      } as any);

      const res = await app.inject({
        method: "GET",
        url: "/api/support/thread",
        headers: { "x-guest-token": "guest-abc" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBe(11);
    });
  });

  describe("POST /api/support/message", () => {
    it("fails with validation error on empty text", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/support/message",
        headers: { authorization: "Bearer user-token" },
        payload: { text: "   " },
      });

      expect(res.statusCode).toBe(400);
    });

    it("creates user message and returns 201", async () => {
      vi.mocked(prisma.supportThread.findFirst).mockResolvedValue({ id: 10, userId: 2 } as any);
      vi.mocked(prisma.supportMessage.create).mockResolvedValue({
        id: 101,
        threadId: 10,
        text: "Привет!",
      } as any);
      vi.mocked(prisma.supportThread.update).mockResolvedValue({ id: 10 } as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/support/message",
        headers: { authorization: "Bearer user-token" },
        payload: { text: "Привет!" },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.message.id).toBe(101);
    });
  });

  describe("POST /api/support/read", () => {
    it("fails with 400 when threadId is missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/support/read",
        headers: { authorization: "Bearer user-token" },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it("fails with 400 when neither user nor guest token provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/support/read",
        payload: { threadId: 10 },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 404 when thread is not found or does not belong to user", async () => {
      vi.mocked(prisma.supportThread.findFirst).mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/api/support/read",
        headers: { authorization: "Bearer user-token" },
        payload: { threadId: 999 },
      });
      expect(res.statusCode).toBe(404);
    });

    it("marks thread as read and returns 200", async () => {
      vi.mocked(prisma.supportThread.findFirst).mockResolvedValue({ id: 10, userId: 2 } as any);
      vi.mocked(prisma.supportThread.update).mockResolvedValue({ id: 10, unreadByUser: 0 } as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/support/read",
        headers: { authorization: "Bearer user-token" },
        payload: { threadId: 10 },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ success: true });
    });
  });

  describe("Admin Support Routes", () => {
    it("returns 403 for non-admin on GET /api/admin/support/threads", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/support/threads",
        headers: { authorization: "Bearer user-token" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("returns 200 with threads list for admin", async () => {
      vi.mocked(prisma.supportThread.findMany).mockResolvedValue([
        { id: 1, status: "open" },
      ] as any);
      vi.mocked(prisma.supportThread.count).mockResolvedValue(1);

      const res = await app.inject({
        method: "GET",
        url: "/api/admin/support/threads",
        headers: { authorization: "Bearer admin-token" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.threads).toHaveLength(1);
    });

    it("sends admin reply on POST /api/admin/support/threads/:id/reply", async () => {
      vi.mocked(prisma.supportMessage.create).mockResolvedValue({
        id: 201,
        threadId: 5,
        text: "Ответ поддержки",
      } as any);
      vi.mocked(prisma.supportThread.update).mockResolvedValue({ id: 5 } as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/admin/support/threads/5/reply",
        headers: { authorization: "Bearer admin-token" },
        payload: { text: "Ответ поддержки" },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.message.id).toBe(201);
    });

    it("deletes single message on DELETE /api/admin/support/messages/:id", async () => {
      vi.mocked(prisma.supportMessage.delete).mockResolvedValue({ id: 55 } as any);

      const res = await app.inject({
        method: "DELETE",
        url: "/api/admin/support/messages/55",
        headers: { authorization: "Bearer admin-token" },
      });

      expect(res.statusCode).toBe(204);
    });

    it("deletes whole thread (chat clear) on DELETE /api/admin/support/threads/:id", async () => {
      vi.mocked(prisma.supportThread.delete).mockResolvedValue({ id: 5 } as any);

      const res = await app.inject({
        method: "DELETE",
        url: "/api/admin/support/threads/5",
        headers: { authorization: "Bearer admin-token" },
      });

      expect(res.statusCode).toBe(204);
    });

    it("rejects unauthorized request with 403 on /threads/get-or-create when user is not admin", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/support/threads/get-or-create",
        headers: { authorization: "Bearer user-token" },
        payload: { userId: 10 },
      });
      expect(response.statusCode).toBe(403);
    });

    it("returns 400 for invalid body on /threads/get-or-create", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/support/threads/get-or-create",
        headers: { authorization: "Bearer admin-token" },
        payload: { userId: -5 },
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns 404 when user does not exist on /threads/get-or-create", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/support/threads/get-or-create",
        headers: { authorization: "Bearer admin-token" },
        payload: { userId: 999 },
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 200 with threadId on success on /threads/get-or-create", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 10 } as any);
      vi.mocked(prisma.supportThread.findFirst).mockResolvedValue({ id: 12, userId: 10 } as any);

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/support/threads/get-or-create",
        headers: { authorization: "Bearer admin-token" },
        payload: { userId: 10 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toEqual({ threadId: 12, isNew: false });
    });

    it("returns 400 when query parameter q is missing on /users/search", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/support/users/search",
        headers: { authorization: "Bearer admin-token" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns users matching query on /users/search", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: 10, username: "testreader", email: "tr@test.com", avatarUrl: null },
      ] as any);

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/support/users/search?q=test",
        headers: { authorization: "Bearer admin-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].username).toBe("testreader");
    });
  });
});
