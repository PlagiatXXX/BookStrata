import { describe, it, expect, vi, beforeEach } from "vitest";
import * as service from "./achievements.service.js";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    achievement: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    userAchievement: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
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

  describe("getUserPublicAchievements", () => {
    const mockAchievement = {
      id: "bookworm_1",
      title: "Начинающий читатель",
      description: "Добавить 1 книгу в тир-лист",
      iconUrl: "🐛",
      xpValue: 10,
      isSecret: false,
    };

    it("возвращает только достижения с записью UserAchievement (плоский формат)", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 1 });
      (prisma.userAchievement.findMany as any).mockResolvedValue([
        { achievement: mockAchievement, earnedAt: new Date("2026-01-15T10:00:00Z") },
      ]);

      const result = await service.getUserPublicAchievements(1);

      expect(result).toEqual([
        {
          id: "bookworm_1",
          title: "Начинающий читатель",
          description: "Добавить 1 книгу в тир-лист",
          iconUrl: "🐛",
          xpValue: 10,
          earnedAt: "2026-01-15T10:00:00.000Z",
        },
      ]);
      expect(prisma.userAchievement.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: { achievement: true },
        orderBy: { earnedAt: "desc" },
      });
    });

    it("нераскрытое секретное (isSecret, нет записи) отсутствует, полученное секретное присутствует", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 1 });
      // Prisma по конструкции возвращает только записи UserAchievement:
      // secret_speed получен, secret_lucky — нет (записи нет)
      (prisma.userAchievement.findMany as any).mockResolvedValue([
        {
          achievement: { ...mockAchievement, id: "secret_speed", title: "Скорочтение", isSecret: true },
          earnedAt: new Date("2026-02-01T12:00:00Z"),
        },
      ]);

      const result = await service.getUserPublicAchievements(1);

      expect(result).toHaveLength(1);
      const revealed = result[0] as any;
      expect(revealed.id).toBe("secret_speed");
      expect(revealed.title).toBe("Скорочтение");
      expect(revealed.description).not.toBe("???");
      // Сервис не запрашивает все достижения — нераскрытые секретные не могут попасть в ответ
      expect(prisma.achievement.findMany).not.toHaveBeenCalled();
    });

    it("earnedAt — ISO-строка, iconUrl прокидывается", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 1 });
      (prisma.userAchievement.findMany as any).mockResolvedValue([
        {
          achievement: { ...mockAchievement, iconUrl: null },
          earnedAt: new Date("2026-03-05T08:30:00Z"),
        },
      ]);

      const result = await service.getUserPublicAchievements(1);

      expect(typeof (result[0] as any).earnedAt).toBe("string");
      expect((result[0] as any).earnedAt).toBe("2026-03-05T08:30:00.000Z");
      expect((result[0] as any).iconUrl).toBeNull();
    });

    it("несуществующий пользователь → NotFoundError", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(service.getUserPublicAchievements(999)).rejects.toThrow(NotFoundError);
    });
  });
});
