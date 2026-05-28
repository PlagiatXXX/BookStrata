import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userWarning: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { ModerationService } from "./moderation.service.js"
import { prisma } from "../../lib/prisma.js"

describe("ModerationService", () => {
  let service: ModerationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ModerationService(prisma as any)
  })

  describe("getUserStatus", () => {
    it("должен вернуть chatBanned: true при перманентном бане (chatBannedUntil = null)", async () => {
      ;(prisma.user.findUnique as any).mockResolvedValue({
        id: 1,
        username: "test",
        chatBannedAt: new Date("2026-05-28T10:00:00Z"),
        chatBannedUntil: null,
        suspendedAt: null,
        suspendedUntil: null,
        suspensionReason: null,
        role: { id: 1, name: "user" },
        _count: { warnings: 0 },
      })

      const result = await service.getUserStatus(1)

      expect(result.chatBanned).toBe(true)
    })

    it("должен вернуть chatBanned: true при временном бане", async () => {
      const future = new Date(Date.now() + 3600000)
      ;(prisma.user.findUnique as any).mockResolvedValue({
        id: 1,
        username: "test",
        chatBannedAt: new Date(),
        chatBannedUntil: future,
        suspendedAt: null,
        suspendedUntil: null,
        suspensionReason: null,
        role: { id: 1, name: "user" },
        _count: { warnings: 0 },
      })

      const result = await service.getUserStatus(1)

      expect(result.chatBanned).toBe(true)
    })

    it("должен вернуть chatBanned: false если бана нет", async () => {
      ;(prisma.user.findUnique as any).mockResolvedValue({
        id: 1,
        username: "test",
        chatBannedAt: null,
        chatBannedUntil: null,
        suspendedAt: null,
        suspendedUntil: null,
        suspensionReason: null,
        role: { id: 1, name: "user" },
        _count: { warnings: 0 },
      })

      const result = await service.getUserStatus(1)

      expect(result.chatBanned).toBe(false)
    })

    it("должен вернуть chatBanned: false если срок бана истёк", async () => {
      const past = new Date("2020-01-01T00:00:00Z")
      ;(prisma.user.findUnique as any).mockResolvedValue({
        id: 1,
        username: "test",
        chatBannedAt: past,
        chatBannedUntil: past,
        suspendedAt: null,
        suspendedUntil: null,
        suspensionReason: null,
        role: { id: 1, name: "user" },
        _count: { warnings: 0 },
      })

      const result = await service.getUserStatus(1)

      expect(result.chatBanned).toBe(false)
    })
  })

  describe("banChat", () => {
    it("должен установить chatBannedAt и chatBannedUntil = null при перманентном бане", async () => {
      ;(prisma.user.update as any).mockResolvedValue({ id: 1, username: "test" })

      const result = await service.banChat(1, 99)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          chatBannedAt: expect.any(Date),
          chatBannedUntil: null,
        },
        select: { id: true, username: true },
      })
      expect(result.chatBannedUntil).toBeNull()
    })

    it("должен установить chatBannedUntil в будущее при бане с длительностью", async () => {
      ;(prisma.user.update as any).mockResolvedValue({ id: 1, username: "test" })

      await service.banChat(1, 99, 24)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          chatBannedAt: expect.any(Date),
          chatBannedUntil: expect.any(Date),
        },
        select: { id: true, username: true },
      })
    })
  })

  describe("unbanChat", () => {
    it("должен сбросить chatBannedAt и chatBannedUntil в null", async () => {
      ;(prisma.user.update as any).mockResolvedValue({ id: 1, username: "test" })

      await service.unbanChat(1, 99)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          chatBannedAt: null,
          chatBannedUntil: null,
        },
        select: { id: true, username: true },
      })
    })
  })

  describe("warn", () => {
    it("должен создать предупреждение", async () => {
      const mockWarning = {
        id: 1,
        message: "Нарушение",
        createdAt: new Date(),
        moderator: { id: 99, username: "admin" },
      }
      ;(prisma.$transaction as any).mockResolvedValue([mockWarning])

      const result = await service.warn(1, 99, "Нарушение")

      expect(result).toEqual(mockWarning)
    })
  })

  describe("getWarnings", () => {
    it("должен вернуть список предупреждений", async () => {
      const mockWarnings = [
        { id: 1, message: "Warning 1", createdAt: new Date(), moderator: { id: 99, username: "admin" } },
      ]
      ;(prisma.userWarning.findMany as any).mockResolvedValue(mockWarnings)

      const result = await service.getWarnings(1)

      expect(result).toEqual(mockWarnings)
    })
  })
})
