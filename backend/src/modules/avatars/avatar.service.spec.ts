import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Моки для Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Импортируем после vi.mock
import * as avatarService from "./avatar.service.js";
import { prisma } from "../../lib/prisma.js";

// Устанавливаем тестовые env переменные
process.env.POLLINATIONS_API_KEY = "test-pollinations-key";
process.env.POLLINATIONS_MODEL = "zimage";

describe("avatar.service", () => {
  const mockUserId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("generateAvatar - Free пользователи", () => {
    it("должен отклонить генерацию если Free лимит = 0", async () => {
      // Мокируем isProUser через require после импорта сервиса
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );

      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Daily limit reached (0 per day)");
    });

    it("должен вернуть ошибку если пользователь не найден", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );

      (prisma.user.findUnique as any).mockResolvedValue(null);

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });
  });

  describe("generateAvatar - Pro пользователи", () => {
    const mockProUser = {
      id: mockUserId,
      aiAvatarsGenerated: 5,
      lastAvatarResetAt: new Date(),
    };

    beforeEach(async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );
      (prisma.user.findUnique as any).mockResolvedValue(mockProUser);
      (prisma.user.update as any).mockResolvedValue({});
    });

    it("должен разрешить генерацию если лимит не достигнут", async () => {
      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(44); // 50 - 5 - 1 = 44
    });

    it("должен отклонить генерацию если Pro лимит достигнут", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        ...mockProUser,
        aiAvatarsGenerated: 50,
      });

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Daily limit reached (50 per day)");
    });

    it("должен сбросить счётчик если новый день", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.user.findUnique as any).mockResolvedValue({
        ...mockProUser,
        aiAvatarsGenerated: 50,
        lastAvatarResetAt: yesterday,
      });

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(49); // 50 - 0 - 1 = 49

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiAvatarsGenerated: 0,
            lastAvatarResetAt: expect.any(Date),
          }),
        }),
      );
    });

    it("должен сгенерировать URL для Pollinations API", async () => {
      const result = await avatarService.generateAvatar(
        "cyberpunk portrait",
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain("https://gen.pollinations.ai/image/");
      expect(result.imageUrl).toContain("model=zimage"); // Из env переменной
      expect(result.imageUrl).toContain("width=512");
      expect(result.imageUrl).toContain("height=512");
      expect(result.imageUrl).toContain("seed=");
      expect(result.imageUrl).toContain("nologo=true");
    });

    it("должен добавить API key в URL если есть", async () => {
      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.imageUrl).toContain("key=test-pollinations-key");
    });

    it("должен увеличить счётчик сгенерированных аватаров", async () => {
      await avatarService.generateAvatar("test prompt", mockUserId);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiAvatarsGenerated: { increment: 1 },
          }),
        }),
      );
    });

    it('должен добавить "portrait, face, square format, avatar, high quality" к промпту', async () => {
      await avatarService.generateAvatar("test prompt", mockUserId);

      expect(prisma.user.update).toHaveBeenCalled();
    });

    it("должен использовать случайный seed для каждого запроса", async () => {
      const result1 = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );
      const result2 = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      const seed1 = result1.imageUrl?.match(/seed=(\d+)/)?.[1];
      const seed2 = result2.imageUrl?.match(/seed=(\d+)/)?.[1];

      expect(seed1).toBeDefined();
      expect(seed2).toBeDefined();
    });

    it("должен вернуть remaining количество генераций", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        ...mockProUser,
        aiAvatarsGenerated: 3,
      });

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.remaining).toBe(46); // 50 - 3 - 1 = 46
    });

    it("должен использовать fallback URL при ошибке", async () => {
      (prisma.user.findUnique as any).mockRejectedValue(new Error("API error"));

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain(
        "https://api.dicebear.com/7.x/adventurer/svg",
      );
    });
  });

  describe("generateAvatar - Admin пользователи", () => {
    it("должен разрешить генерацию если userRole = admin", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );

      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: new Date(),
      });
      (prisma.user.update as any).mockResolvedValue({});

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
        "admin",
      );

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(49); // 50 - 0 - 1 = 49
    });

    it("должен разрешить генерацию если userRole = moderator", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );

      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: new Date(),
      });
      (prisma.user.update as any).mockResolvedValue({});

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
        "moderator",
      );

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(49); // 50 - 0 - 1 = 49
    });
  });

  describe("getAvatarLimit - Free пользователи", () => {
    beforeEach(async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );
    });

    it("должен вернуть информацию о лимите Free пользователя", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toEqual({
        used: 0,
        limit: 0,
        remaining: 0,
        isPro: false,
      });
    });

    it("должен вернуть использовано если Free пользователь уже генерировал", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toEqual({
        used: 5,
        limit: 0,
        remaining: 0,
        isPro: false,
      });
    });

    it("должен вернуть 0 used если новый день", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 10,
        lastAvatarResetAt: yesterday,
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toEqual({
        used: 0,
        limit: 0,
        remaining: 0,
        isPro: false,
      });
    });
  });

  describe("getAvatarLimit - Pro пользователи", () => {
    beforeEach(async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );
    });

    it("должен вернуть информацию о лимите Pro пользователя", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toEqual({
        used: 5,
        limit: 50,
        remaining: 45,
        isPro: true,
      });
    });

    it("должен вернуть 0 used если новый день", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 50,
        lastAvatarResetAt: yesterday,
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toEqual({
        used: 0,
        limit: 50,
        remaining: 50,
        isPro: true,
      });
    });

    it("должен вернуть правильный remaining если использовано частично", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 7,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result.remaining).toBe(43); // 50 - 7 = 43
    });

    it("должен вернуть 0 remaining если лимит достигнут", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 50,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result.remaining).toBe(0);
    });

    it("должен использовать DAILY_AVATAR_LIMIT = 50 для Pro", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result.limit).toBe(50);
    });
  });

  describe("getAvatarLimit - общие", () => {
    it("должен вернуть null если пользователь не найден", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );

      (prisma.user.findUnique as any).mockResolvedValue(null);

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toBeNull();
    });
  });
});
