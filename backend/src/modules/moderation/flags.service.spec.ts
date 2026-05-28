import { describe, it, expect, vi, beforeEach } from "vitest"
import type { FastifyInstance } from "fastify"

const mockContentFlag = {
  create: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
}

const mockFastify = {
  prisma: {
    contentFlag: mockContentFlag,
  },
} as unknown as FastifyInstance

import { createFlag, getFlags, resolveFlag } from "./flags.service.js"

describe("flags.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createFlag", () => {
    it("должен создать флаг со статусом pending", async () => {
      const mockCreated = {
        id: 1,
        userId: 2,
        imageUrl: "https://example.com/img.jpg",
        flagType: "avatar",
        targetId: null,
        nsfwScore: 0.95,
        status: "pending",
        createdAt: new Date(),
        resolvedAt: null,
        resolvedById: null,
      }
      mockContentFlag.create.mockResolvedValue(mockCreated)

      const result = await createFlag(mockFastify, {
        userId: 2,
        imageUrl: "https://example.com/img.jpg",
        flagType: "avatar",
        targetId: null,
        nsfwScore: 0.95,
      })

      expect(mockContentFlag.create).toHaveBeenCalledWith({
        data: {
          userId: 2,
          imageUrl: "https://example.com/img.jpg",
          flagType: "avatar",
          targetId: null,
          nsfwScore: 0.95,
          status: "pending",
        },
      })
      expect(result).toEqual(mockCreated)
    })

    it("должен создать флаг без nsfwScore и targetId", async () => {
      mockContentFlag.create.mockResolvedValue({
        id: 2,
        userId: 3,
        imageUrl: "https://example.com/img2.jpg",
        flagType: "book-cover",
        targetId: null,
        nsfwScore: null,
        status: "pending",
        createdAt: new Date(),
      })

      await createFlag(mockFastify, {
        userId: 3,
        imageUrl: "https://example.com/img2.jpg",
        flagType: "book-cover",
      })

      expect(mockContentFlag.create).toHaveBeenCalledWith({
        data: {
          userId: 3,
          imageUrl: "https://example.com/img2.jpg",
          flagType: "book-cover",
          targetId: null,
          nsfwScore: null,
          status: "pending",
        },
      })
    })
  })

  describe("getFlags", () => {
    it("должен вернуть пагинированный список флагов", async () => {
      const mockItems = [
        {
          id: 1,
          userId: 2,
          imageUrl: "https://example.com/img.jpg",
          flagType: "avatar",
          targetId: null,
          nsfwScore: 0.95,
          status: "pending",
          createdAt: new Date("2026-05-28T10:00:00Z"),
          resolvedAt: null,
          user: { id: 2, username: "moderator", avatarUrl: "https://example.com/avatar.jpg" },
          resolvedBy: null,
        },
      ]
      mockContentFlag.findMany.mockResolvedValue(mockItems)
      mockContentFlag.count.mockResolvedValue(1)

      const result = await getFlags(mockFastify, "pending", 1, 20)

      expect(mockContentFlag.findMany).toHaveBeenCalledWith({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          resolvedBy: { select: { username: true } },
        },
      })
      expect(mockContentFlag.count).toHaveBeenCalledWith({ where: { status: "pending" } })
      expect(result).toEqual({
        flags: [
          {
            id: 1,
            userId: 2,
            username: "moderator",
            avatarUrl: "https://example.com/avatar.jpg",
            imageUrl: "https://example.com/img.jpg",
            flagType: "avatar",
            targetId: null,
            nsfwScore: 0.95,
            status: "pending",
            createdAt: mockItems[0].createdAt,
            resolvedAt: null,
            resolvedByUsername: null,
          },
        ],
        total: 1,
      })
    })

    it("должен вернуть resolvedByUsername если resolvedBy есть", async () => {
      mockContentFlag.findMany.mockResolvedValue([
        {
          id: 2,
          userId: 5,
          imageUrl: "https://example.com/img3.jpg",
          flagType: "tier-cover",
          targetId: "tl-1",
          nsfwScore: null,
          status: "resolved",
          createdAt: new Date(),
          resolvedAt: new Date(),
          user: { id: 5, username: "user1", avatarUrl: null },
          resolvedBy: { username: "admin" },
        },
      ])
      mockContentFlag.count.mockResolvedValue(1)

      const result = await getFlags(mockFastify)

      expect(result.flags[0].resolvedByUsername).toBe("admin")
    })

    it("должен вернуть все флаги если status не указан", async () => {
      mockContentFlag.findMany.mockResolvedValue([])
      mockContentFlag.count.mockResolvedValue(0)

      await getFlags(mockFastify)

      expect(mockContentFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      )
    })

    it("должен применить page = 1 и pageSize = 20 по умолчанию", async () => {
      mockContentFlag.findMany.mockResolvedValue([])
      mockContentFlag.count.mockResolvedValue(0)

      await getFlags(mockFastify)

      expect(mockContentFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      )
    })
  })

  describe("resolveFlag", () => {
    it("должен обновить статус и проставить resolvedAt и resolvedById", async () => {
      const mockUpdated = {
        id: 1,
        status: "resolved",
        resolvedAt: new Date(),
        resolvedById: 1,
      }
      mockContentFlag.update.mockResolvedValue(mockUpdated)

      const result = await resolveFlag(mockFastify, 1, 1, "resolved")

      expect(mockContentFlag.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "resolved", resolvedAt: expect.any(Date), resolvedById: 1 },
      })
      expect(result.status).toBe("resolved")
    })

    it("должен поддержать action dismissed", async () => {
      mockContentFlag.update.mockResolvedValue({
        id: 2,
        status: "dismissed",
        resolvedAt: new Date(),
        resolvedById: 2,
      })

      const result = await resolveFlag(mockFastify, 2, 2, "dismissed")

      expect(mockContentFlag.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { status: "dismissed", resolvedAt: expect.any(Date), resolvedById: 2 },
      })
      expect(result.status).toBe("dismissed")
    })
  })
})
