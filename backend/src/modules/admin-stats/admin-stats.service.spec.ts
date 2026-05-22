import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

import { AdminStatsService } from "./admin-stats.service.js";
import { prisma } from "../../lib/prisma.js";

describe("AdminStatsService", () => {
  let adminStatsService: AdminStatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    adminStatsService = new AdminStatsService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getStats", () => {
    it("должен вернуть статистику со всеми 4 показателями", async () => {
      (prisma.user.count as any).mockResolvedValueOnce(100);
      (prisma.user.count as any).mockResolvedValueOnce(25);
      (prisma.newsArticle.count as any).mockResolvedValue(10);
      (prisma.tierList.count as any).mockResolvedValue(500);

      const result = await adminStatsService.getStats();

      expect(prisma.user.count).toHaveBeenCalledTimes(2);
      expect(prisma.user.count).toHaveBeenCalledWith();
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          isPro: true,
          OR: [
            { proExpiresAt: null },
            { proExpiresAt: { gte: expect.any(Date) } },
          ],
        },
      });
      expect(prisma.newsArticle.count).toHaveBeenCalledWith({ where: { isPublished: true } });
      expect(prisma.tierList.count).toHaveBeenCalledWith();

      expect(result).toEqual({
        totalUsers: 100,
        proUsers: 25,
        activeNews: 10,
        tierLists: 500,
      });
    });

    it("должен вернуть нули если БД пуста", async () => {
      (prisma.user.count as any).mockResolvedValue(0);
      (prisma.user.count as any).mockResolvedValue(0);
      (prisma.newsArticle.count as any).mockResolvedValue(0);
      (prisma.tierList.count as any).mockResolvedValue(0);

      const result = await adminStatsService.getStats();

      expect(result).toEqual({
        totalUsers: 0,
        proUsers: 0,
        activeNews: 0,
        tierLists: 0,
      });
    });

    it("должен запрашивать все 4 показателя", async () => {
      (prisma.user.count as any).mockResolvedValue(42);
      (prisma.newsArticle.count as any).mockResolvedValue(7);
      (prisma.tierList.count as any).mockResolvedValue(200);

      const result = await adminStatsService.getStats();

      expect(prisma.user.count).toHaveBeenCalledTimes(2);
      expect(prisma.newsArticle.count).toHaveBeenCalledOnce();
      expect(prisma.tierList.count).toHaveBeenCalledOnce();
      expect(result).toEqual({
        totalUsers: 42,
        proUsers: 42,
        activeNews: 7,
        tierLists: 200,
      });
    });
  });
});
