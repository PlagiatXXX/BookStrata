import { describe, it, expect, vi, beforeEach } from "vitest";
import * as service from "./achievements.service.js";
import { prisma } from "../../lib/prisma.js";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    achievement: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    userAchievement: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    tierList: {
      count: vi.fn(),
    },
    bookPlacement: {
      count: vi.fn(),
    },
    tierListLike: {
      count: vi.fn(),
    },
    book: {
      count: vi.fn(),
    },
    battleParticipant: {
      count: vi.fn(),
    },
    battle: {
      count: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe("Achievements Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTitleByXP / getTitleEntryByXP", () => {
    it("should return the correct title for 0 XP", () => {
      expect(service.getTitleByXP(0)).toBe("Подглядывающий в книги");
    });

    it("should return the correct title for 150 XP", () => {
      expect(service.getTitleByXP(150)).toBe("Шкафный стратег");
    });

    it("should return the highest title for very high XP", () => {
      expect(service.getTitleByXP(100000)).toBe("Легенда BookStrata");
    });

    it("getTitleEntryByXP should return title + icon", () => {
      const entry = service.getTitleEntryByXP(150);
      expect(entry.title).toBe("Шкафный стратег");
      expect(entry.icon).toBe("📄");
    });

    it("getTitleEntryByXP should return icon for lowest tier", () => {
      const entry = service.getTitleEntryByXP(0);
      expect(entry.title).toBe("Подглядывающий в книги");
      expect(entry.icon).toBe("👀");
    });
  });

  describe("checkAndGrantAchievement", () => {
    it("should grant achievement and update title", async () => {
      const mockUserId = 1;
      const mockAchievementId = "bookworm_1";
      const mockAchievement = { id: "bookworm_1", title: "Test", xpValue: 10 };

      (prisma.userAchievement.findUnique as any).mockResolvedValue(null);
      (prisma.achievement.findUnique as any).mockResolvedValue(mockAchievement);
      (prisma.userAchievement.create as any).mockResolvedValue({ achievement: mockAchievement });
      (prisma.user.update as any).mockResolvedValue({ xp: 10, title: "Новичок" });

      const result = await service.checkAndGrantAchievement(mockUserId, mockAchievementId as any);

      expect(result).toEqual(mockAchievement);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe("processAction", () => {
    it("should process curator achievement", async () => {
      (prisma.tierList.count as any).mockResolvedValue(1);
      (prisma.achievement.findUnique as any).mockImplementation((args: any) => {
          return Promise.resolve({ id: args.where.id, title: "Mock", xpValue: 20 });
      });
      (prisma.userAchievement.findUnique as any).mockResolvedValue(null);
      (prisma.user.update as any).mockResolvedValue({ xp: 20, title: "Новичок" });
      (prisma.userAchievement.create as any).mockImplementation((args: any) => {
          return Promise.resolve({ achievement: { id: args.data.achievementId, title: "Mock", xpValue: 20 } });
      });

      const results = await service.processAction(1, 'create_tier_list');
      expect(results.some(a => a.id === 'curator_1')).toBe(true);
      expect(results.some(a => a.id === 'first_tier_list')).toBe(true);
    });
  });
});
