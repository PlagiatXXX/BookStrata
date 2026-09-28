import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";

// Мокаем тяжёлые/внешние зависимости роута
vi.mock("./tierList.service.js", () => ({
  getFullTierList: vi.fn(),
  getPublicTierLists: vi.fn(),
  getUserTierLists: vi.fn(),
  getTierListWhereClause: vi.fn(),
  isUuid: vi.fn(() => false),
  addBooksToTierList: vi.fn(),
}));

vi.mock("./likes/likes.service.js", () => ({
  like: vi.fn(),
  unlike: vi.fn(),
  getLikesWithStatus: vi.fn(),
}));

vi.mock("../../lib/upload.js", () => ({
  uploadBase64: vi.fn(),
  uploadFromUrl: vi.fn(),
  uploadBase64WithOg: vi.fn(),
  uploadFromUrlWithOg: vi.fn(),
}));

vi.mock("../../lib/nsfw-check.js", () => ({
  assertImageAllowed: vi.fn(),
}));

vi.mock("../../lib/event-emitter.js", () => ({
  eventBus: {
    emit: vi.fn().mockResolvedValue([]),
    on: vi.fn(),
  },
}));

import * as service from "./tierList.service.js";

const privateList: any = {
  id: "list-1",
  slug: null,
  userId: 42,
  isPublic: false,
  title: "Private List",
  likesCount: 0,
  tiers: [],
  placements: [],
};

const publicList: any = { ...privateList, isPublic: true };

describe("Доступ к приватным тир-листам (admin/moderator)", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });

    // Подделка auth: роль из токена (как делает глобальный authPlugin)
    instance.addHook("preHandler", (request: any, _reply: any, done: any) => {
      const auth = request.headers.authorization;
      if (auth === "Bearer admin-token") {
        request.user = { userId: 1, username: "admin", role: "admin" };
      } else if (auth === "Bearer mod-token") {
        request.user = { userId: 3, username: "mod", role: "moderator" };
      } else if (auth === "Bearer user-token") {
        request.user = { userId: 2, username: "user", role: "user" };
      } else if (auth === "Bearer owner-token") {
        request.user = { userId: 42, username: "owner", role: "user" };
      }
      done();
    });

    const { tierListRoutes } = await import("./tierList.route.js");
    await instance.register(tierListRoutes, { prefix: "/api/tier-lists" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(service.isUuid).mockReturnValue(false);
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /api/tier-lists/:id — приватный список", () => {
    beforeEach(() => {
      vi.mocked(service.getFullTierList).mockResolvedValue(privateList);
    });

    it("admin видит приватный список (200)", async () => {
      const res = await request(app.server)
        .get("/api/tier-lists/list-1")
        .set("Authorization", "Bearer admin-token")
        .expect(200);
      expect(res.body.data.id).toBe("list-1");
    });

    it("moderator видит приватный список (200)", async () => {
      const res = await request(app.server)
        .get("/api/tier-lists/list-1")
        .set("Authorization", "Bearer mod-token")
        .expect(200);
      expect(res.body.data.id).toBe("list-1");
    });

    it("чужой пользователь получает 403", async () => {
      await request(app.server)
        .get("/api/tier-lists/list-1")
        .set("Authorization", "Bearer user-token")
        .expect(403);
    });

    it("аноним получает 403", async () => {
      await request(app.server).get("/api/tier-lists/list-1").expect(403);
    });

    it("владелец видит свой приватный список (200)", async () => {
      await request(app.server)
        .get("/api/tier-lists/list-1")
        .set("Authorization", "Bearer owner-token")
        .expect(200);
    });
  });

  describe("GET /api/tier-lists/:id — публичный список", () => {
    beforeEach(() => {
      vi.mocked(service.getFullTierList).mockResolvedValue(publicList);
    });

    it("аноним видит публичный список (200)", async () => {
      await request(app.server).get("/api/tier-lists/list-1").expect(200);
    });
  });

  describe("GET /api/tier-lists/public — includePrivate для staff", () => {
    beforeEach(() => {
      vi.mocked(service.getPublicTierLists).mockResolvedValue({
        data: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 },
        links: {},
      } as any);
    });

    it("admin получает приватные списки в ленте", async () => {
      await request(app.server)
        .get("/api/tier-lists/public")
        .set("Authorization", "Bearer admin-token")
        .expect(200);
      expect(service.getPublicTierLists).toHaveBeenCalledWith(
        expect.anything(),
        { includePrivate: true },
      );
    });

    it("moderator получает приватные списки в ленте", async () => {
      await request(app.server)
        .get("/api/tier-lists/public")
        .set("Authorization", "Bearer mod-token")
        .expect(200);
      expect(service.getPublicTierLists).toHaveBeenCalledWith(
        expect.anything(),
        { includePrivate: true },
      );
    });

    it("аноним получает только публичные", async () => {
      await request(app.server).get("/api/tier-lists/public").expect(200);
      expect(service.getPublicTierLists).toHaveBeenCalledWith(
        expect.anything(),
        { includePrivate: false },
      );
    });

    it("обычный пользователь получает только публичные", async () => {
      await request(app.server)
        .get("/api/tier-lists/public")
        .set("Authorization", "Bearer user-token")
        .expect(200);
      expect(service.getPublicTierLists).toHaveBeenCalledWith(
        expect.anything(),
        { includePrivate: false },
      );
    });
  });
});
