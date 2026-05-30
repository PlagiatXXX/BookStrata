import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    user: { count: vi.fn() },
    battle: { count: vi.fn() },
    tierList: { count: vi.fn() },
    book: { count: vi.fn() },
  };
  return { prisma: tx };
});

import { prisma } from "../../lib/prisma.js";
import { getForumStats } from "./forum.service.js";

describe("forum.service", () => {
  describe("getForumStats", () => {
    it("должен возвращать количество пользователей и активных битв", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(42);
      vi.mocked(prisma.battle.count).mockResolvedValue(5);
      vi.mocked(prisma.tierList.count).mockResolvedValue(100);
      vi.mocked(prisma.book.count).mockResolvedValue(500);

      const stats = await getForumStats();

      expect(stats).toEqual({ totalUsers: 42, activeBattles: 5, tierLists: 100, totalBooks: 500 });
      expect(prisma.user.count).toHaveBeenCalledOnce();
      expect(prisma.battle.count).toHaveBeenCalledWith({
        where: {
          status: "active",
          endTime: { gt: expect.any(Date) },
        },
      });
      expect(prisma.tierList.count).toHaveBeenCalledOnce();
      expect(prisma.book.count).toHaveBeenCalledOnce();
    });

    it("должен возвращать нули если нет пользователей и битв", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.battle.count).mockResolvedValue(0);
      vi.mocked(prisma.tierList.count).mockResolvedValue(0);
      vi.mocked(prisma.book.count).mockResolvedValue(0);

      const stats = await getForumStats();

      expect(stats).toEqual({ totalUsers: 0, activeBattles: 0, tierLists: 0, totalBooks: 0 });
    });

    it("должен считать активные битвы, а не все", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(100);
      vi.mocked(prisma.battle.count).mockResolvedValue(3);
      vi.mocked(prisma.tierList.count).mockResolvedValue(50);
      vi.mocked(prisma.book.count).mockResolvedValue(200);

      const stats = await getForumStats();

      expect(stats.activeBattles).toBe(3);
      expect(prisma.battle.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "active" }),
        }),
      );
    });
  });
});
