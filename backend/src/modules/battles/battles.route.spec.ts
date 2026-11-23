import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
vi.mock("./battles.service.js", () => ({
  createBattle: vi.fn(),
  getActiveBattles: vi.fn(),
  getBattleById: vi.fn(),
  voteInBattle: vi.fn(),
  closeBattle: vi.fn(),
  applyToBattle: vi.fn(),
  applyGeneral: vi.fn(),
  getApplications: vi.fn(),
  getPendingApplications: vi.fn(),
  getApprovedApplications: vi.fn(),
  reviewApplication: vi.fn(),
}));

import * as mockService from "./battles.service.js";

describe("Battles Routes", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    await instance.register(cors, { origin: true });

    // Auth hook — проверяет Authorization header и выставляет request.user
    instance.addHook("preHandler", (request: any, _reply: any, done: any) => {
      const authHeader = request.headers.authorization;
      if (authHeader === "Bearer admin-token") {
        request.user = { userId: 1, username: "admin", role: "admin" };
      } else if (authHeader === "Bearer user-token") {
        request.user = { userId: 2, username: "user", role: "user" };
      } else if (authHeader === "Bearer moderator-token") {
        request.user = { userId: 3, username: "moderator", role: "moderator" };
      }
      // Если токена нет — request.user остаётся undefined (как в реальном authMiddleware)
      done();
    });

    const { battleRoutes } = await import("./battles.route.js");
    await instance.register(
      async (sub) => {
        await battleRoutes(sub);
      },
      { prefix: "/api/battles" },
    );

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

  describe("GET /api/battles", () => {
    it("должен вернуть список активных битв", async () => {
      const mockBattles = [{ id: "battle-1", title: "Weekly Battle" }];
      (mockService.getActiveBattles as any).mockResolvedValue(mockBattles);

      const res = await app.inject({ method: "GET", url: "/api/battles" });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual(mockBattles);
    });
  });

  describe("GET /api/battles/:id", () => {
    it("должен вернуть битву по ID", async () => {
      const mockBattle = { id: "battle-1", title: "Test" };
      (mockService.getBattleById as any).mockResolvedValue(mockBattle);

      const res = await app.inject({ method: "GET", url: "/api/battles/battle-1" });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual(mockBattle);
      expect(mockService.getBattleById).toHaveBeenCalledWith("battle-1");
    });

    it("должен вернуть 404 если битва не найдена", async () => {
      (mockService.getBattleById as any).mockResolvedValue(null);

      const res = await app.inject({ method: "GET", url: "/api/battles/unknown" });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("not_found");
    });
  });

  describe("POST /api/battles", () => {
    it("должен создать битву (admin)", async () => {
      const mockBattle = { id: "new-battle", title: "New Battle" };
      (mockService.createBattle as any).mockResolvedValue(mockBattle);

      const res = await app.inject({
        method: "POST",
        url: "/api/battles",
        headers: { authorization: "Bearer admin-token" },
        payload: {
          title: "New Battle",
          type: "weekly",
          endTime: new Date(Date.now() + 86400000).toISOString(),
          participantTierListIds: ["tl-1", "tl-2"],
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data).toEqual(mockBattle);
      expect(res.headers.location).toBe("/api/battles/new-battle");
    });

    it("должен вернуть 401 без авторизации", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/battles",
        payload: {
          title: "Test",
          type: "weekly",
          endTime: new Date(Date.now() + 86400000).toISOString(),
          participantTierListIds: ["tl-1", "tl-2"],
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error).toBe("Unauthorized");
    });

    it("должен вернуть 403 для обычного пользователя", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/battles",
        headers: { authorization: "Bearer user-token" },
        payload: {
          title: "Test",
          type: "weekly",
          endTime: new Date(Date.now() + 86400000).toISOString(),
          participantTierListIds: ["tl-1", "tl-2"],
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("Требуется роль администратора или модератора");
    });

    it("должен создать битву (moderator)", async () => {
      (mockService.createBattle as any).mockResolvedValue({ id: "new-battle" });

      const res = await app.inject({
        method: "POST",
        url: "/api/battles",
        headers: { authorization: "Bearer moderator-token" },
        payload: {
          title: "Mod Battle",
          type: "weekly",
          endTime: new Date(Date.now() + 86400000).toISOString(),
          participantTierListIds: ["tl-1", "tl-2"],
        },
      });

      expect(res.statusCode).toBe(201);
    });
  });

  describe("POST /api/battles/:id/vote", () => {
    it("должен проголосовать", async () => {
      (mockService.voteInBattle as any).mockResolvedValue({ success: true });

      const res = await app.inject({
        method: "POST",
        url: "/api/battles/battle-1/vote",
        headers: { authorization: "Bearer user-token" },
        payload: { tierListId: "tl-1" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual({ success: true });
      expect(mockService.voteInBattle).toHaveBeenCalledWith(2, "battle-1", "tl-1");
    });

    it("должен вернуть 401 без авторизации", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/battles/battle-1/vote",
        payload: { tierListId: "tl-1" },
      });

      expect(res.statusCode).toBe(401);
    });

    it("должен вернуть 409 при повторном голосе", async () => {
      const p2002 = new Error("Unique constraint");
      (p2002 as any).code = "P2002";
      (mockService.voteInBattle as any).mockRejectedValue(p2002);

      const res = await app.inject({
        method: "POST",
        url: "/api/battles/battle-1/vote",
        headers: { authorization: "Bearer user-token" },
        payload: { tierListId: "tl-1" },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("conflict");
    });
  });

  describe("GET /api/battles/applications/pending", () => {
    it("должен вернуть pending заявки (admin)", async () => {
      (mockService.getPendingApplications as any).mockResolvedValue([{ id: 1, status: "pending" }]);

      const res = await app.inject({
        method: "GET",
        url: "/api/battles/applications/pending",
        headers: { authorization: "Bearer admin-token" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([{ id: 1, status: "pending" }]);
    });

    it("должен вернуть 403 для обычного пользователя", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/battles/applications/pending",
        headers: { authorization: "Bearer user-token" },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/battles/applications/approved", () => {
    it("должен вернуть approved заявки (admin)", async () => {
      (mockService.getApprovedApplications as any).mockResolvedValue([]);

      const res = await app.inject({
        method: "GET",
        url: "/api/battles/applications/approved",
        headers: { authorization: "Bearer admin-token" },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("POST /api/battles/apply", () => {
    it("должен создать общую заявку", async () => {
      (mockService.applyGeneral as any).mockResolvedValue({ id: 1 });

      const res = await app.inject({
        method: "POST",
        url: "/api/battles/apply",
        headers: { authorization: "Bearer user-token" },
        payload: { tierListId: "tl-1", message: "Join!" },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data).toEqual({ id: 1 });
      expect(mockService.applyGeneral).toHaveBeenCalledWith(2, "tl-1", "Join!");
    });

    it("должен вернуть 401 без авторизации", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/battles/apply",
        payload: { tierListId: "tl-1" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/battles/:id/close", () => {
    it("должен закрыть битву (admin)", async () => {
      (mockService.closeBattle as any).mockResolvedValue({ id: "battle-1", status: "completed" });

      const res = await app.inject({
        method: "POST",
        url: "/api/battles/battle-1/close",
        headers: { authorization: "Bearer admin-token" },
      });

      expect(res.statusCode).toBe(200);
    });

    it("должен вернуть 403 для обычного пользователя", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/battles/battle-1/close",
        headers: { authorization: "Bearer user-token" },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("POST /api/battles/:id/apply", () => {
    it("должен создать заявку на битву", async () => {
      (mockService.applyToBattle as any).mockResolvedValue({ id: 1 });

      const res = await app.inject({
        method: "POST",
        url: "/api/battles/battle-1/apply",
        headers: { authorization: "Bearer user-token" },
        payload: { tierListId: "tl-1" },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data).toEqual({ id: 1 });
    });
  });

  describe("GET /api/battles/:id/applications", () => {
    it("должен вернуть заявки битвы (admin)", async () => {
      (mockService.getApplications as any).mockResolvedValue([]);

      const res = await app.inject({
        method: "GET",
        url: "/api/battles/battle-1/applications",
        headers: { authorization: "Bearer admin-token" },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("PATCH /api/battles/applications/:applicationId", () => {
    it("должен одобрить общую заявку (admin)", async () => {
      (mockService.reviewApplication as any).mockResolvedValue({ status: "approved" });

      const res = await app.inject({
        method: "PATCH",
        url: "/api/battles/applications/1",
        headers: { authorization: "Bearer admin-token" },
        payload: { status: "approved" },
      });

      expect(res.statusCode).toBe(200);
    });

    it("должен вернуть 400 при невалидном ID", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/battles/applications/abc",
        headers: { authorization: "Bearer admin-token" },
        payload: { status: "approved" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("invalid_input");
    });
  });

  describe("PATCH /api/battles/:id/applications/:applicationId", () => {
    it("должен одобрить заявку в битве (admin)", async () => {
      (mockService.reviewApplication as any).mockResolvedValue({ status: "approved" });

      const res = await app.inject({
        method: "PATCH",
        url: "/api/battles/battle-1/applications/1",
        headers: { authorization: "Bearer admin-token" },
        payload: { status: "approved" },
      });

      expect(res.statusCode).toBe(200);
    });
  });
});