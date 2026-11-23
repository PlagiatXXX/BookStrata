import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";

vi.mock("./forum.service.js", () => ({
  getForumStats: vi.fn(),
}));

import * as mockService from "./forum.service.js";

describe("Forum Routes", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });

    const { forumRoutes } = await import("./forum.route.js");
    await instance.register(forumRoutes, { prefix: "/api/forum" });

    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /api/forum/stats", () => {
    it("должен возвращать статистику форума", async () => {
      vi.mocked(mockService.getForumStats).mockResolvedValue({
        totalUsers: 42,
        activeBattles: 5,
        tierLists: 100,
        totalBooks: 500,
        totalThoughts: 30,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/forum/stats",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        data: { totalUsers: 42, activeBattles: 5, tierLists: 100, totalBooks: 500, totalThoughts: 30 },
      });
    });

    it("должен возвращать нули если данных нет", async () => {
      vi.mocked(mockService.getForumStats).mockResolvedValue({
        totalUsers: 0,
        activeBattles: 0,
        tierLists: 0,
        totalBooks: 0,
        totalThoughts: 0,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/forum/stats",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        data: { totalUsers: 0, activeBattles: 0, tierLists: 0, totalBooks: 0, totalThoughts: 0 },
      });
    });

    it("не требует авторизации", async () => {
      vi.mocked(mockService.getForumStats).mockResolvedValue({
        totalUsers: 10,
        activeBattles: 2,
        tierLists: 50,
        totalBooks: 200,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/forum/stats",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data).toBeDefined();
    });
  });
});
