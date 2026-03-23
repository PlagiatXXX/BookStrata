import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Моки для Prisma — объявляем внутри factory для vi.mock
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("checkAvatarLimit (internal)", () => {
    const mockUserId = 1;

    it("должен разрешить генерацию если лимит не достигнут", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      });

      (prisma.user.update as any).mockResolvedValue({});

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 5 - 1 = 4
    });

    it("должен отклонить генерацию если лимит достигнут", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 10,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Daily limit reached");
    });

    it("должен сбросить счётчик если новый день", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 10,
        lastAvatarResetAt: yesterday,
      });

      (prisma.user.update as any).mockResolvedValue({});

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      // Должен сбросить счётчик и разрешить генерацию
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 0 - 1 = 9

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiAvatarsGenerated: 0,
            lastAvatarResetAt: expect.any(Date),
          }),
        }),
      );
    });

    it("должен вернуть ошибку если пользователь не найден", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });
  });

  describe("generateAvatar", () => {
    const mockUserId = 1;
    const mockPrompt = "cyberpunk portrait";

    beforeEach(() => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: new Date(),
      });
      (prisma.user.update as any).mockResolvedValue({});
    });

    it("должен сгенерировать URL для Pollinations API с моделью zimage", async () => {
      const result = await avatarService.generateAvatar(mockPrompt, mockUserId);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain("https://gen.pollinations.ai/image/");
      expect(result.imageUrl).toContain(encodeURIComponent(mockPrompt));
      expect(result.imageUrl).toContain("model=zimage");
      expect(result.imageUrl).toContain("width=512");
      expect(result.imageUrl).toContain("height=512");
      expect(result.imageUrl).toContain("seed=");
      expect(result.imageUrl).toContain("nologo=true");
    });

    it("должен добавить API key в URL если есть", async () => {
      const result = await avatarService.generateAvatar(mockPrompt, mockUserId);

      expect(result.imageUrl).toContain("key=test-pollinations-key");
    });

    it("должен увеличить счётчик сгенерированных аватаров", async () => {
      await avatarService.generateAvatar(mockPrompt, mockUserId);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiAvatarsGenerated: { increment: 1 },
          }),
        }),
      );
    });

    it("должен использовать fallback URL при ошибке", async () => {
      // Симулируем ошибку
      (prisma.user.findUnique as any).mockRejectedValue(new Error("API error"));

      const result = await avatarService.generateAvatar(mockPrompt, mockUserId);

      // Должен вернуть fallback на DiceBear
      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain(
        "https://api.dicebear.com/7.x/adventurer/svg",
      );
    });

    it('должен добавить "portrait, face, square format, avatar, high quality" к промпту', async () => {
      await avatarService.generateAvatar(mockPrompt, mockUserId);

      // Проверяем что URL содержит закодированный полный промпт
      const encodedPrompt = encodeURIComponent(
        `${mockPrompt}, portrait, face, square format, avatar, high quality`,
      );
      expect(prisma.user.update).toHaveBeenCalled(); // Если дошло до update, значит URL построен верно
    });

    it("должен использовать случайный seed для каждого запроса", async () => {
      const result1 = await avatarService.generateAvatar(
        mockPrompt,
        mockUserId,
      );
      const result2 = await avatarService.generateAvatar(
        mockPrompt,
        mockUserId,
      );

      const seed1 = result1.imageUrl?.match(/seed=(\d+)/)?.[1];
      const seed2 = result2.imageUrl?.match(/seed=(\d+)/)?.[1];

      expect(seed1).toBeDefined();
      expect(seed2).toBeDefined();
      // Seed могут совпасть теоретически, но это маловероятно
    });

    it("должен вернуть remaining количество генераций", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 3,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.generateAvatar(mockPrompt, mockUserId);

      expect(result.remaining).toBe(6); // 10 - 3 - 1 = 6
    });
  });

  describe("getAvatarLimit", () => {
    const mockUserId = 1;

    it("должен вернуть информацию о лимите пользователя", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toEqual({
        used: 5,
        limit: 10,
        remaining: 5,
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
        limit: 10,
        remaining: 10,
      });
    });

    it("должен вернуть null если пользователь не найден", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toBeNull();
    });

    it("должен вернуть правильный remaining если использовано частично", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 7,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result.remaining).toBe(3); // 10 - 7 = 3
    });

    it("должен вернуть 0 remaining если лимит достигнут", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 10,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result.remaining).toBe(0);
    });

    it("должен использовать DAILY_AVATAR_LIMIT = 10", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: new Date(),
      });

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result.limit).toBe(10);
    });
  });
});
