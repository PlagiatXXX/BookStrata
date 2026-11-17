import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors.js";
import { ErrorCodes, createApiError } from "../../lib/api-response.js";
import { userRoutes } from "./users.route.js";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    userBadge: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((req: any, _reply: any, done: () => void) => {
    req.user = { userId: 1, role: "user" };
    done();
  }),
}));

vi.mock("./users.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./users.service.js")>();
  return {
    ...actual,
    getUserById: vi.fn().mockImplementation(async (params: { id: string }) => {
      actual.parseUserIdParam(params.id);
      return { id: Number(params.id), username: "testuser" };
    }),
    getUserPublicTierLists: vi.fn().mockResolvedValue({ data: [], totalItems: 0 }),
    getTasteMatch: vi.fn().mockResolvedValue({ score: 0 }),
    getUserBadges: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("../achievements/achievements.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../achievements/achievements.service.js")>();
  return {
    ...actual,
    getUserPublicAchievements: vi.fn(),
  };
});

describe("Users Routes - ID Parameter Validation", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });

    // Обработчик AppError аналогичен боевому в server.ts
    app.setErrorHandler((error, _request, reply) => {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(createApiError(error.code as any, error.message, error.details));
      }
      return reply.code(500).send({ error: error.message });
    });

    await app.register(userRoutes, { prefix: "/api/users" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /api/users/:id", () => {
    it("валидный id → 200", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/42" });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.id).toBe(42);
    });

    it("нечисловой id ('pavlova') → 404 NotFoundError", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/pavlova" });
      expect(res.statusCode).toBe(404);
      const json = res.json();
      expect(json.error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(json.error.message).toBe("Пользователь не найден");
    });

    it("отрицательный id ('-5') → 404", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/-5" });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it("id превышающий Int4 ('9999999999') → 404", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/9999999999" });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe("GET /api/users/:id/tier-lists", () => {
    it("валидный id → 200", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/42/tier-lists" });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toBeDefined();
    });

    it("нечисловой id ('pavlova') → 404", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/pavlova/tier-lists" });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe("GET /api/users/:id/taste-match", () => {
    it("валидный id → 200", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/42/taste-match" });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toBeDefined();
    });

    it("нечисловой id ('pavlova') → 404", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/pavlova/taste-match" });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe("GET /api/users/:id/badges", () => {
    it("валидный id → 200", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/42/badges" });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toBeDefined();
    });

    it("нечисловой id ('pavlova') → 404", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/pavlova/badges" });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe("GET /api/users/:id/achievements", () => {
    it("без авторизации, валидный id → 200 и массив достижений", async () => {
      const { getUserPublicAchievements } = await import("../achievements/achievements.service.js");
      (getUserPublicAchievements as any).mockResolvedValue([
        {
          id: "bookworm_1",
          title: "Начинающий читатель",
          description: "Добавить 1 книгу в тир-лист",
          iconUrl: "🐛",
          xpValue: 10,
          earnedAt: "2026-01-15T10:00:00.000Z",
        },
      ]);

      const res = await app.inject({ method: "GET", url: "/api/users/42/achievements" });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0]).toMatchObject({ id: "bookworm_1", xpValue: 10 });
    });

    it("несуществующий пользователь → 404", async () => {
      const { getUserPublicAchievements } = await import("../achievements/achievements.service.js");
      const { NotFoundError } = await import("../../lib/errors.js");
      (getUserPublicAchievements as any).mockRejectedValue(new NotFoundError("Пользователь не найден"));

      const res = await app.inject({ method: "GET", url: "/api/users/999/achievements" });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it("нечисловой id ('pavlova') → 404", async () => {
      const res = await app.inject({ method: "GET", url: "/api/users/pavlova/achievements" });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });
});
