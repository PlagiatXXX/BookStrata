import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Моки для Prisma — объявляем внутри factory для vi.mock
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    template: {
      count: vi.fn(),
    },
    tierListLike: {
      count: vi.fn(),
    },
    tierList: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

// Мокаем bcryptjs ПЕРЕД импортом
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed_${pw}`),
    compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
  },
  hash: vi.fn(async (pw: string) => `hashed_${pw}`),
  compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
}));

// Импортируем после vi.mock
import bcrypt from "bcryptjs";
import * as userService from "./users.service.js";
import { prisma } from "../../lib/prisma.js";

describe("users.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getMe", () => {
    const mockUserId = 1;
    const mockUser = {
      id: mockUserId,
      email: "user@example.com",
      username: "testuser",
      avatarUrl: "https://example.com/avatar.jpg",
      isPro: false,
      proExpiresAt: null,
      createdAt: new Date("2024-01-01"),
      role: {
        name: "user",
      },
    };

    it("должен вернуть текущего пользователя", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await userService.getMe(mockUserId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          isPro: true,
          proExpiresAt: true,
          role: {
            select: {
              name: true,
            },
          },
          createdAt: true,
        },
      });

      expect(result).toEqual({
        ...mockUser,
        role: "user",
      });
    });

    it("должен бросить ошибку если пользователь не найден", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(userService.getMe(mockUserId)).rejects.toThrow(
        "Пользователь не найден",
      );
    });

    it("должен вернуть пользователя без avatarUrl если аватара нет", async () => {
      const userWithoutAvatar = { ...mockUser, avatarUrl: null };
      (prisma.user.findUnique as any).mockResolvedValue(userWithoutAvatar);

      const result = await userService.getMe(mockUserId);

      expect(result.avatarUrl).toBeNull();
    });
  });

  describe("updateUser", () => {
    const mockUserId = 1;
    const mockNewUsername = "newusername";

    const mockUpdatedUser = {
      id: mockUserId,
      email: "user@example.com",
      username: mockNewUsername,
      avatarUrl: null,
      createdAt: new Date("2024-01-01"),
      role: {
        name: "user",
      },
    };

    it("должен обновить имя пользователя", async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.update as any).mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser(mockUserId, mockNewUsername);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: mockNewUsername,
          NOT: { id: mockUserId },
        },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { username: mockNewUsername },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      expect(result).toEqual(mockUpdatedUser);
    });

    it("должен бросить ошибку если имя занято", async () => {
      (prisma.user.findFirst as any).mockResolvedValue({
        id: 999,
        username: mockNewUsername,
      });

      await expect(
        userService.updateUser(mockUserId, mockNewUsername),
      ).rejects.toThrow("Это имя пользователя уже занято");
    });

    it("должен разрешить оставить текущее имя", async () => {
      const currentUser = { ...mockUpdatedUser, username: "currentname" };
      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.update as any).mockResolvedValue(currentUser);

      const result = await userService.updateUser(mockUserId, "currentname");

      expect(result.username).toBe("currentname");
    });
  });

  describe("updateAvatar", () => {
    const mockUserId = 1;
    const mockAvatarUrl = "https://example.com/new-avatar.jpg";

    const mockUpdatedUser = {
      id: mockUserId,
      email: "user@example.com",
      username: "testuser",
      avatarUrl: mockAvatarUrl,
    };

    it("должен обновить аватар", async () => {
      (prisma.user.update as any).mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateAvatar(mockUserId, mockAvatarUrl);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { avatarUrl: mockAvatarUrl },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
        },
      });

      expect(result.avatarUrl).toBe(mockAvatarUrl);
    });

    it("должен установить null если avatarUrl null", async () => {
      const userWithNullAvatar = { ...mockUpdatedUser, avatarUrl: null };
      (prisma.user.update as any).mockResolvedValue(userWithNullAvatar);

      const result = await userService.updateAvatar(mockUserId, null);

      expect(result.avatarUrl).toBeNull();
    });
  });

  describe("deleteAvatar", () => {
    const mockUserId = 1;

    const mockUserAfterDelete = {
      id: mockUserId,
      email: "user@example.com",
      username: "testuser",
      avatarUrl: null,
    };

    it("должен удалить аватар (установить null)", async () => {
      (prisma.user.update as any).mockResolvedValue(mockUserAfterDelete);

      const result = await userService.deleteAvatar(mockUserId);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { avatarUrl: null },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
        },
      });

      expect(result.avatarUrl).toBeNull();
    });
  });

  describe("changePassword", () => {
    const mockUserId = 1;
    const mockCurrentPassword = "oldPassword123";
    const mockNewPassword = "newPassword456";

    const mockUser = {
      id: mockUserId,
      passwordHash: "hashed_oldPassword123",
    };

    it("должен изменить пароль", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockResolvedValue({});

      const result = await userService.changePassword(
        mockUserId,
        mockCurrentPassword,
        mockNewPassword,
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: {
          id: true,
          passwordHash: true,
        },
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            passwordHash: "hashed_newPassword456",
          },
        }),
      );

      expect(result).toEqual({
        success: true,
        message: "Пароль успешно изменён",
      });
    });

    it("должен бросить ошибку если пользователь не найден", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        userService.changePassword(
          mockUserId,
          mockCurrentPassword,
          mockNewPassword,
        ),
      ).rejects.toThrow("Пользователь не найден");
    });

    it("должен бросить ошибку если текущий пароль неверный", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(
        userService.changePassword(
          mockUserId,
          "wrongPassword",
          mockNewPassword,
        ),
      ).rejects.toThrow("Неверный текущий пароль");
    });

    it("должен захешировать новый пароль", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockResolvedValue({});

      await userService.changePassword(
        mockUserId,
        mockCurrentPassword,
        mockNewPassword,
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            passwordHash: "hashed_newPassword456",
          },
        }),
      );
    });

    it("должен использовать bcrypt.compare для проверки пароля", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockResolvedValue({});

      await userService.changePassword(
        mockUserId,
        mockCurrentPassword,
        mockNewPassword,
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockCurrentPassword,
        mockUser.passwordHash,
      );
    });
  });

  describe("getUserById", () => {
    const mockUserId = "1";
    const mockUser = {
      id: 1,
      username: "testuser",
      avatarUrl: "https://example.com/avatar.jpg",
      createdAt: new Date("2024-01-01"),
    };

    it("должен вернуть пользователя по ID", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await userService.getUserById({ id: mockUserId });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      expect(result).toEqual(mockUser);
    });

    it("должен бросить ошибку если пользователь не найден", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(userService.getUserById({ id: mockUserId })).rejects.toThrow(
        "Пользователь не найден",
      );
    });

    it("должен бросить ошибку при невалидном ID", async () => {
      await expect(
        userService.getUserById({ id: "invalid" }),
      ).rejects.toThrow();
    });
  });

  describe("getUserStats", () => {
    const mockUserId = 1;

    it("должен вернуть статистику пользователя", async () => {
      (prisma.tierList.count as any).mockResolvedValue(5);
      (prisma.template.count as any).mockResolvedValue(3);
      (prisma.tierListLike.count as any).mockResolvedValueOnce(10); // total likes
      (prisma.tierListLike.count as any).mockResolvedValueOnce(2); // today likes

      const result = await userService.getUserStats(mockUserId);

      expect(result).toEqual({
        tierListsCount: 5,
        templatesCount: 3,
        likesCount: 10,
        likesTodayCount: 2,
      });
    });

    it("должен посчитать likesToday за последние 24 часа", async () => {
      (prisma.tierList.count as any).mockResolvedValue(0);
      (prisma.template.count as any).mockResolvedValue(0);
      (prisma.tierListLike.count as any).mockResolvedValue(0);

      await userService.getUserStats(mockUserId);

      expect(prisma.tierListLike.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tierList: { userId: mockUserId },
            createdAt: { gte: expect.any(Date) },
          }),
        }),
      );

      // Проверяем что был вызов с фильтром по дате (likesToday)
      const countCalls = (prisma.tierListLike.count as any).mock.calls;
      const likesTodayCall = countCalls.find(
        (call: any) => call[0]?.where?.createdAt?.gte instanceof Date,
      );

      expect(likesTodayCall).toBeDefined();
      const oneDayAgo = likesTodayCall[0].where.createdAt.gte;
      const expectedOneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(oneDayAgo.getTime()).toBeCloseTo(expectedOneDayAgo.getTime(), -3); // ±1 секунда
    });

    it("должен вернуть нули если нет данных", async () => {
      (prisma.tierList.count as any).mockResolvedValue(0);
      (prisma.template.count as any).mockResolvedValue(0);
      (prisma.tierListLike.count as any).mockResolvedValue(0);

      const result = await userService.getUserStats(mockUserId);

      expect(result).toEqual({
        tierListsCount: 0,
        templatesCount: 0,
        likesCount: 0,
        likesTodayCount: 0,
      });
    });

    it("должен посчитать общие лайки через count по userId", async () => {
      (prisma.tierList.count as any).mockResolvedValue(1);
      (prisma.template.count as any).mockResolvedValue(0);
      (prisma.tierListLike.count as any).mockResolvedValue(5);

      await userService.getUserStats(mockUserId);

      expect(prisma.tierListLike.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tierList: { userId: mockUserId },
          },
        }),
      );
    });
  });
});
