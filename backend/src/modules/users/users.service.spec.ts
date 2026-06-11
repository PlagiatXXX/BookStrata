import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Моки для Prisma — объявляем внутри factory для vi.mock
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
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
      findFirst: vi.fn(),
    },
    bookPlacement: {
      count: vi.fn(),
      findMany: vi.fn(),
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

const { mockAggregateUserStats, mockFindPublicByUserId, mockFindUserTierListIds } = vi.hoisted(() => ({
  mockAggregateUserStats: vi.fn(),
  mockFindPublicByUserId: vi.fn(),
  mockFindUserTierListIds: vi.fn(),
}))

vi.mock("../../repositories/index.js", () => ({
  tierListRepository: {
    aggregateUserStats: mockAggregateUserStats,
    findPublicByUserId: mockFindPublicByUserId,
    findUserTierListIds: mockFindUserTierListIds,
  },
}))

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
      isPro: false,
      proExpiresAt: null,
      role: {
        name: "user",
      },
      createdAt: new Date("2024-01-01"),
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
          role: {
            select: { name: true },
          },
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
      isPro: false,
      proExpiresAt: null,
      role: { name: "user" },
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
          role: {
            select: { name: true },
          },
          createdAt: true,
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
      isPro: false,
      proExpiresAt: null,
      role: { name: "user" },
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
          role: {
            select: { name: true },
          },
          createdAt: true,
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
      isPro: true,
      proExpiresAt: new Date("2099-01-01"),
      xp: 150,
      title: "Книжный червь",
      isDonor: true,
      role: { name: "admin" },
      createdAt: new Date("2024-01-01"),
    };

    beforeEach(() => {
      mockAggregateUserStats.mockResolvedValue({
        _count: { _all: 5 },
        _sum: { likesCount: 10 },
      })
      ;(prisma.tierList.count as any).mockResolvedValue(3)
      ;(prisma.bookPlacement.count as any).mockResolvedValue(20)
      ;(prisma.tierList.findFirst as any).mockResolvedValue({ updatedAt: new Date("2024-06-01") })
    })

    it("должен вернуть пользователя по ID с расширенными полями", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await userService.getUserById({ id: mockUserId });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          xp: true,
          title: true,
          isDonor: true,
          role: {
            select: { name: true },
          },
          createdAt: true,
        },
      });

      expect(result).toEqual({
        id: 1,
        username: "testuser",
        avatarUrl: "https://example.com/avatar.jpg",
        xp: 150,
        title: "Книжный червь",
        icon: "📄",
        isDonor: true,
        role: "admin",
        createdAt: mockUser.createdAt,
        stats: {
          tierListsCount: 5,
          publishedCount: 3,
          likesCount: 10,
          totalBooks: 20,
          lastActivity: expect.any(String),
        },
      });
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

    beforeEach(() => {
      mockAggregateUserStats.mockReset()
    })

    it("должен вернуть статистику пользователя", async () => {
      mockAggregateUserStats.mockResolvedValue({
        _count: { _all: 5 },
        _sum: { likesCount: 10 },
      })
      ;(prisma.template.count as any).mockResolvedValue(3);
      (prisma.tierListLike.count as any).mockResolvedValue(2); // today likes
      (prisma.tierList.count as any).mockResolvedValue(4);
      (prisma.bookPlacement.count as any).mockResolvedValue(20);
      (prisma.tierList.findFirst as any).mockResolvedValue({ updatedAt: new Date() });

      const result = await userService.getUserStats(mockUserId);

      expect(result).toEqual({
        tierListsCount: 5,
        publishedCount: 4,
        templatesCount: 3,
        likesCount: 10,
        likesTodayCount: 2,
        totalBooks: 20,
        lastActivity: expect.any(String),
      });

      expect(mockAggregateUserStats).toHaveBeenCalledWith(mockUserId);
    });

    it("должен посчитать likesToday за последние 24 часа", async () => {
      mockAggregateUserStats.mockResolvedValue({
        _count: { _all: 0 },
        _sum: { likesCount: 0 },
      })
      ;(prisma.template.count as any).mockResolvedValue(0);
      (prisma.tierListLike.count as any).mockResolvedValue(0);
      (prisma.tierList.count as any).mockResolvedValue(0);
      (prisma.bookPlacement.count as any).mockResolvedValue(0);
      (prisma.tierList.findFirst as any).mockResolvedValue(null);

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
      mockAggregateUserStats.mockResolvedValue({
        _count: { _all: 0 },
        _sum: { likesCount: null },
      })
      ;(prisma.template.count as any).mockResolvedValue(0);
      (prisma.tierListLike.count as any).mockResolvedValue(0);
      (prisma.tierList.count as any).mockResolvedValue(0);
      (prisma.bookPlacement.count as any).mockResolvedValue(0);
      (prisma.tierList.findFirst as any).mockResolvedValue(null);

      const result = await userService.getUserStats(mockUserId);

      expect(result).toEqual({
        tierListsCount: 0,
        publishedCount: 0,
        templatesCount: 0,
        likesCount: 0,
        likesTodayCount: 0,
        totalBooks: 0,
        lastActivity: null,
      });
    });
  });

  describe("getUserPublicTierLists", () => {
    const userId = 1

    beforeEach(() => {
      mockFindPublicByUserId.mockReset()
    })

    it("должен вернуть пагинированные публичные тир-листы", async () => {
      const mockData = [
        {
          id: "uuid-1",
          title: "My List",
          slug: null,
          coverImageUrl: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-06-01"),
          isPublic: true,
          likesCount: 5,
          user: { username: "testuser", avatarUrl: null },
          _count: { placements: 3 },
        },
        {
          id: "uuid-2",
          title: "Another List",
          slug: "another-list",
          coverImageUrl: "https://example.com/cover.jpg",
          createdAt: new Date("2024-02-01"),
          updatedAt: new Date("2024-07-01"),
          isPublic: true,
          likesCount: 2,
          user: { username: "testuser", avatarUrl: "https://example.com/av.jpg" },
          _count: { placements: 1 },
        },
      ]
      mockFindPublicByUserId.mockResolvedValue([mockData, 2])

      const result = await userService.getUserPublicTierLists(userId, 1, 10)

      expect(mockFindPublicByUserId).toHaveBeenCalledWith(userId, { page: 1, pageSize: 10 })

      expect(result).toEqual({
        data: [
          {
            id: "uuid-1",
            title: "My List",
            slug: null,
            coverImageUrl: null,
            createdAt: mockData[0].createdAt,
            updatedAt: mockData[0].updatedAt,
            isPublic: true,
            likesCount: 5,
            user: { username: "testuser", avatarUrl: null },
            booksCount: 3,
          },
          {
            id: "uuid-2",
            title: "Another List",
            slug: "another-list",
            coverImageUrl: "https://example.com/cover.jpg",
            createdAt: mockData[1].createdAt,
            updatedAt: mockData[1].updatedAt,
            isPublic: true,
            likesCount: 2,
            user: { username: "testuser", avatarUrl: "https://example.com/av.jpg" },
            booksCount: 1,
          },
        ],
        totalItems: 2,
      })
    })

    it("должен вернуть пустой массив если нет публичных тир-листов", async () => {
      mockFindPublicByUserId.mockResolvedValue([[], 0])

      const result = await userService.getUserPublicTierLists(userId, 1, 10)

      expect(result).toEqual({ data: [], totalItems: 0 })
    })
  })

  describe("getTasteMatch", () => {
    const targetUserId = 1
    const currentUserId = 2

    beforeEach(() => {
      mockFindUserTierListIds.mockReset()
      ;(prisma.bookPlacement.findMany as any).mockReset()
    })

    it("должен вернуть совпадение вкусов между двумя пользователями", async () => {
      mockFindUserTierListIds
        .mockResolvedValueOnce(["tl-1", "tl-2"]) // target user
        .mockResolvedValueOnce(["tl-3", "tl-4"]) // current user

      const mockTargetPlacements = [
        { book: { title: "Dune", author: "Frank Herbert" } },
        { book: { title: "1984", author: "George Orwell" } },
        { book: { title: "Brave New World", author: "Aldous Huxley" } },
      ]
      const mockUserPlacements = [
        { book: { title: "Dune", author: "Frank Herbert" } },
        { book: { title: "Fahrenheit 451", author: "Ray Bradbury" } },
      ]
      ;(prisma.bookPlacement.findMany as any)
        .mockResolvedValueOnce(mockTargetPlacements)
        .mockResolvedValueOnce(mockUserPlacements)

      const result = await userService.getTasteMatch(targetUserId, currentUserId)

      expect(mockFindUserTierListIds).toHaveBeenCalledWith(targetUserId)
      expect(mockFindUserTierListIds).toHaveBeenCalledWith(currentUserId)
      expect(prisma.bookPlacement.findMany).toHaveBeenCalledTimes(2)

      expect(result).toEqual({
        matchPercent: 25,
        commonBooks: 1,
        totalBooks: 3,
      })
    })

    it("должен вернуть 0% если у целевого пользователя нет тир-листов", async () => {
      mockFindUserTierListIds.mockResolvedValueOnce([])

      const result = await userService.getTasteMatch(targetUserId, currentUserId)

      expect(result).toEqual({ matchPercent: 0, commonBooks: 0, totalBooks: 0 })
    })

    it("должен вернуть 0% если у текущего пользователя нет тир-листов", async () => {
      mockFindUserTierListIds
        .mockResolvedValueOnce(["tl-1"])
        .mockResolvedValueOnce([])

      const mockTargetPlacements = [
        { book: { title: "Dune", author: "Frank Herbert" } },
      ]
      ;(prisma.bookPlacement.findMany as any).mockResolvedValueOnce(mockTargetPlacements)

      const result = await userService.getTasteMatch(targetUserId, currentUserId)

      expect(result).toEqual({ matchPercent: 0, commonBooks: 0, totalBooks: 1 })
    })

    it("должен вернуть 100% если все книги совпадают", async () => {
      mockFindUserTierListIds
        .mockResolvedValueOnce(["tl-1"])
        .mockResolvedValueOnce(["tl-3"])

      const placements = [
        { book: { title: "Dune", author: "Frank Herbert" } },
        { book: { title: "1984", author: "George Orwell" } },
      ]
      ;(prisma.bookPlacement.findMany as any)
        .mockResolvedValueOnce(placements)
        .mockResolvedValueOnce(placements)

      const result = await userService.getTasteMatch(targetUserId, currentUserId)

      expect(result).toEqual({ matchPercent: 100, commonBooks: 2, totalBooks: 2 })
    })
  })

  describe("getViolators", () => {
    const mockBannedUser = {
      id: 1,
      username: "banned",
      email: "banned@test.com",
      chatBannedAt: new Date("2026-05-28T10:00:00Z"),
      chatBannedUntil: null,
      suspendedAt: null,
      suspendedUntil: null,
      suspensionReason: null,
      role: { name: "user" },
      warnings: [],
      _count: { warnings: 0 },
    }

    const mockSuspendedUser = {
      id: 2,
      username: "suspended",
      email: "suspended@test.com",
      chatBannedAt: null,
      chatBannedUntil: null,
      suspendedAt: new Date("2026-05-28T10:00:00Z"),
      suspendedUntil: new Date("2026-06-28T10:00:00Z"),
      suspensionReason: "Нарушение правил",
      role: { name: "user" },
      warnings: [],
      _count: { warnings: 0 },
    }

    const mockWarnedUser = {
      id: 3,
      username: "warned",
      email: "warned@test.com",
      chatBannedAt: null,
      chatBannedUntil: null,
      suspendedAt: null,
      suspendedUntil: null,
      suspensionReason: null,
      role: { name: "user" },
      warnings: [
        {
          id: 1,
          message: "Не пиши капсом",
          createdAt: new Date("2026-05-27T10:00:00Z"),
          moderator: { id: 99, username: "admin" },
        },
      ],
      _count: { warnings: 1 },
    }

    it("должен вернуть список нарушителей с action'ами", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      ;(prisma.user.findMany as any).mockResolvedValue([mockBannedUser, mockSuspendedUser, mockWarnedUser])

      const result = await userService.getViolators()

      expect(result).toHaveLength(3)

      const banned = result.find((u: any) => u.userId === 1)
      expect(banned?.actions).toHaveLength(1)
      expect(banned?.actions[0].type).toBe("chat_ban")
      expect(banned?.actions[0].until).toBeNull()

      const suspended = result.find((u: any) => u.userId === 2)
      expect(suspended?.actions).toHaveLength(1)
      expect(suspended?.actions[0].type).toBe("suspension")
      expect(suspended?.actions[0].reason).toBe("Нарушение правил")

      const warned = result.find((u: any) => u.userId === 3)
      expect(warned?.actions).toHaveLength(1)
      expect(warned?.actions[0].type).toBe("warning")
      expect(warned?.warningsCount).toBe(1)
    })

    it("должен вернуть пустой массив если нарушителей нет", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      ;(prisma.user.findMany as any).mockResolvedValue([])

      const result = await userService.getViolators()

      expect(result).toEqual([])
    })

    it("должен игнорировать истёкшие блокировки", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      const expired = {
        ...mockSuspendedUser,
        suspendedUntil: new Date("2020-01-01T00:00:00Z"),
      }
      ;(prisma.user.findMany as any).mockResolvedValue([expired])

      const result = await userService.getViolators()

      // пользователь попадёт в список (suspendedAt не null), но actions будут пусты
      expect(result).toHaveLength(1)
      expect(result[0].actions).toHaveLength(0)
    })
  })
});
