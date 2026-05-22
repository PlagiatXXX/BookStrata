import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";
import cors from "@fastify/cors";

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    user: {
      count: vi.fn(),
    },
    newsArticle: {
      count: vi.fn(),
    },
    tierList: {
      count: vi.fn(),
    },
  };
  return { prisma: tx };
});

import { adminStatsRoutes } from "./admin-stats.route.js";

describe("Admin Stats Routes", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    await instance.register(cors, { origin: true });

    instance.addHook("preHandler", (request: any, _reply: any, done: any) => {
      const authHeader = request.headers.authorization;
      if (authHeader === "Bearer admin-token") {
        request.user = { userId: 1, username: "admin", role: "admin" };
      } else if (authHeader === "Bearer user-token") {
        request.user = { userId: 2, username: "user", role: "user" };
      }
      done();
    });

    await instance.register(adminStatsRoutes, { prefix: "/api/admin" });
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

  describe("GET /api/admin/stats", () => {
    it("должен вернуть статистику для админа", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      (prisma.user.count as any).mockResolvedValue(42);
      (prisma.newsArticle.count as any).mockResolvedValue(7);
      (prisma.tierList.count as any).mockResolvedValue(200);

      const res = await request(app.server)
        .get("/api/admin/stats")
        .set("Authorization", "Bearer admin-token")
        .expect(200);

      expect(res.body.data).toEqual({
        totalUsers: 42,
        proUsers: 42,
        activeNews: 7,
        tierLists: 200,
      });
    });

    it("должен вернуть 403 для обычного пользователя", async () => {
      await request(app.server)
        .get("/api/admin/stats")
        .set("Authorization", "Bearer user-token")
        .expect(403);
    });

    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server)
        .get("/api/admin/stats")
        .expect(401);
    });
  });
});
