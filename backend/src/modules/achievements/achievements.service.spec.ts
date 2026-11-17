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

  describe("getUserAchievements — прогресс", () => {
    // Счётчики пользователя: 12 книг, 7 лайков, 2 рецензии, 4 тир-листа, 3 битвы
    const mkAchievement = (
      id: string,
      opts: { isSecret?: boolean; earned?: boolean } = {},
    ) => ({
      id,
      title: `title-${id}`,
      description: `desc-${id}`,
      iconUrl: null,
      xpValue: 10,
      isSecret: opts.isSecret ?? false,
      users: opts.earned ? [{ earnedAt: new Date("2026-01-01T00:00:00Z") }] : [],
    });

    async function run(): Promise<Record<string, any>> {
      (prisma.bookPlacement.count as any).mockResolvedValue(12);
      (prisma.tierListLike.count as any).mockResolvedValue(7);
      (prisma.book.count as any).mockResolvedValue(2);
      (prisma.tierList.count as any).mockResolvedValue(4);
      (prisma.battleParticipant.count as any).mockResolvedValue(3);
      (prisma.achievement.findMany as any).mockResolvedValue([
        mkAchievement("bookworm_2", { earned: true }),
        mkAchievement("bookworm_3"),
        mkAchievement("secret_night", { isSecret: true }),
        mkAchievement("first_tier_list"),
        mkAchievement("popular_1"),
        mkAchievement("critic_1"),
        mkAchievement("curator_1"),
        mkAchievement("fighter_1"),
        mkAchievement("battle_participant"),
        mkAchievement("explorer"),
        mkAchievement("battle_winner"),
        mkAchievement("secret_speed", { isSecret: true, earned: true }),
        mkAchievement("fighter_3"),
      ]);

      const result = await service.getUserAchievements(1);
      return Object.fromEntries(result.map((a: any) => [a.id, a]));
    }

    it("полученному достижению прогресс не отдаётся", async () => {
      const byId = await run();
      expect(byId.bookworm_2.progress).toBeNull();
    });

    it("bookworm_3: { current: 12, target: 15 }", async () => {
      const byId = await run();
      expect(byId.bookworm_3.progress).toEqual({ current: 12, target: 15 });
    });

    it("нераскрытое секретное — progress: null", async () => {
      const byId = await run();
      expect(byId.secret_night.progress).toBeNull();
    });

    it("полученное секретное — progress: null", async () => {
      const byId = await run();
      expect(byId.secret_speed.progress).toBeNull();
    });

    it("first_tier_list — progress: null (условие не выражается числом)", async () => {
      const byId = await run();
      expect(byId.first_tier_list.progress).toBeNull();
    });

    it("popular_1: { current: 7, target: 10 }", async () => {
      const byId = await run();
      expect(byId.popular_1.progress).toEqual({ current: 7, target: 10 });
    });

    it("critic_1: { current: 2, target: 3 }", async () => {
      const byId = await run();
      expect(byId.critic_1.progress).toEqual({ current: 2, target: 3 });
    });

    it("curator_1: { current: 4, target: 1 }", async () => {
      const byId = await run();
      expect(byId.curator_1.progress).toEqual({ current: 4, target: 1 });
    });

    it("fighter_1 и battle_participant: { current: 3, target: 1 }", async () => {
      const byId = await run();
      expect(byId.fighter_1.progress).toEqual({ current: 3, target: 1 });
      expect(byId.battle_participant.progress).toEqual({ current: 3, target: 1 });
    });

    it("explorer и battle_winner — progress: null", async () => {
      const byId = await run();
      expect(byId.explorer.progress).toBeNull();
      expect(byId.battle_winner.progress).toBeNull();
    });

    it("fighter_3 (нет в таблице прогресса спеки §7.3) — progress: null", async () => {
      const byId = await run();
      expect(byId.fighter_3.progress).toBeNull();
    });

    it("счётчики считаются одним batch — по одному вызову на метрику", async () => {
      await run();
      expect(prisma.bookPlacement.count).toHaveBeenCalledTimes(1);
      expect(prisma.tierListLike.count).toHaveBeenCalledTimes(1);
      expect(prisma.book.count).toHaveBeenCalledTimes(1);
      expect(prisma.tierList.count).toHaveBeenCalledTimes(1);
      expect(prisma.battleParticipant.count).toHaveBeenCalledTimes(1);
    });

    it("progress добавляется поверх существующего контракта (isEarned, earnedAt, маскировка секретных)", async () => {
      const byId = await run();
      expect(byId.bookworm_2.isEarned).toBe(true);
      expect(byId.bookworm_2.earnedAt).toEqual(new Date("2026-01-01T00:00:00Z"));
      expect(byId.secret_night.title).toBe("Секретное достижение");
      expect(byId.secret_night.description).toBe("???");
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
