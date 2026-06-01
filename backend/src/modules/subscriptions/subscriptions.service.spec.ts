import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  }
  return { prisma: tx }
})

vi.mock("../../lib/logger.js", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}))

import { SubscriptionsService } from "./subscriptions.service.js"
import { prisma } from "../../lib/prisma.js"

describe("SubscriptionsService", () => {
  let service: SubscriptionsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SubscriptionsService()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const mockUser = { id: 1, username: "test", isPro: true, proExpiresAt: new Date(Date.now() + 86400000) }
  const mockExpiredUser = { id: 2, username: "expired", isPro: true, proExpiresAt: new Date(Date.now() - 86400000) }

  describe("getUserSubscription", () => {
    it("должен вернуть ProSubscription для активного пользователя", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

      const result = await service.getUserSubscription(1)

      expect(result).toEqual({
        userId: 1,
        isPro: true,
        proExpiresAt: mockUser.proExpiresAt,
      })
    })

    it("должен вернуть null если пользователь не найден", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await service.getUserSubscription(999)

      expect(result).toBeNull()
    })

    it("должен деактивировать истекшую подписку", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockExpiredUser as any)
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockExpiredUser, isPro: false, proExpiresAt: null } as any)

      const result = await service.getUserSubscription(2)

      expect(result).toEqual({
        userId: 2,
        isPro: false,
        proExpiresAt: null,
      })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { isPro: false, proExpiresAt: null },
      })
    })
  })

  describe("setProStatus", () => {
    it("должен установить Pro статус", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, isPro: true, proExpiresAt: mockUser.proExpiresAt } as any)

      const result = await service.setProStatus({ userId: 1, isPro: true, expiresAt: mockUser.proExpiresAt })

      expect(result).toEqual({
        userId: 1,
        isPro: true,
        proExpiresAt: mockUser.proExpiresAt,
      })
    })

    it("должен выбросить ошибку если пользователь не найден", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      await expect(service.setProStatus({ userId: 999, isPro: true })).rejects.toThrow("Пользователь 999 не найден")
    })
  })

  describe("activatePro", () => {
    it("должен активировать Pro на 30 дней", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any)

      const result = await service.activatePro(1)

      expect(result.isPro).toBe(true)
      expect(prisma.user.update).toHaveBeenCalled()
    })

    it("должен активировать Pro на указанное количество дней", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any)

      const result = await service.activatePro(1, 365)

      expect(result.isPro).toBe(true)
    })
  })

  describe("expireAllOverdue", () => {
    it("должен деактивировать все просроченные подписки", async () => {
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 5 } as any)

      const result = await service.expireAllOverdue()

      expect(result).toBe(5)
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          isPro: true,
          proExpiresAt: { lt: expect.any(Date) },
        },
        data: {
          isPro: false,
          proExpiresAt: null,
        },
      })
    })

    it("должен вернуть 0 если нет просроченных", async () => {
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 } as any)

      const result = await service.expireAllOverdue()

      expect(result).toBe(0)
    })
  })

  describe("isProUser", () => {
    it("должен вернуть true для активного Pro", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ isPro: true, proExpiresAt: mockUser.proExpiresAt } as any)

      const result = await service.isProUser(1)

      expect(result).toBe(true)
    })

    it("должен вернуть false для обычного пользователя", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ isPro: false, proExpiresAt: null } as any)

      const result = await service.isProUser(4)

      expect(result).toBe(false)
    })

    it("должен вернуть false если пользователь не найден", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await service.isProUser(999)

      expect(result).toBe(false)
    })

    it("должен деактивировать и вернуть false для истекшей подписки", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ isPro: true, proExpiresAt: new Date(Date.now() - 86400000) } as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)

      const result = await service.isProUser(2)

      expect(result).toBe(false)
      expect(prisma.user.update).toHaveBeenCalled()
    })
  })

  describe("getAllProUsers", () => {
    it("должен вернуть всех Pro пользователей", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: 1, isPro: true, proExpiresAt: mockUser.proExpiresAt },
        { id: 3, isPro: true, proExpiresAt: null },
      ] as any)

      const result = await service.getAllProUsers()

      expect(result).toHaveLength(2)
      expect(result[0].userId).toBe(1)
    })
  })

  describe("getSubscriptionStats", () => {
    it("должен вернуть статистику подписок", async () => {
      vi.mocked(prisma.user.count).mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)

      const result = await service.getSubscriptionStats()

      expect(result).toEqual({
        totalProUsers: 10,
        activeSubscriptions: 8,
        lifetimeSubscriptions: 2,
        expiringSoon: 3,
      })
    })
  })
})
