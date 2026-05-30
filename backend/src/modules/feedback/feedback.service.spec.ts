import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    feedback: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }
  return { prisma: tx }
})

import { createFeedback, getAllFeedback, updateFeedbackStatus, deleteFeedback } from "./feedback.service.js"
import { prisma } from "../../lib/prisma.js"

describe("feedback.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("createFeedback", () => {
    it("должен создать фидбек с userId", async () => {
      vi.mocked(prisma.feedback.create).mockResolvedValue({
        id: 1, userId: 1, type: "bug", message: "Тест", pageUrl: null, userEmail: null,
      } as any)

      const result = await createFeedback({
        userId: 1, type: "bug", message: "Тест",
      })

      expect(result).toHaveProperty("id", 1)
      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: { userId: 1, type: "bug", message: "Тест", pageUrl: null, userEmail: null },
      })
    })

    it("должен создать фидбек без userId", async () => {
      vi.mocked(prisma.feedback.create).mockResolvedValue({
        id: 2, userId: null, type: "feature", message: "Идея", pageUrl: "/home", userEmail: "test@test.com",
      } as any)

      const result = await createFeedback({
        userId: null, type: "feature", message: "Идея", pageUrl: "/home", userEmail: "test@test.com",
      })

      expect(result.userId).toBeNull()
    })
  })

  describe("getAllFeedback", () => {
    it("должен вернуть все фидбеки с пользователями", async () => {
      vi.mocked(prisma.feedback.findMany).mockResolvedValue([
        { id: 1, type: "bug", message: "Test", user: { id: 1, username: "test", avatarUrl: null } },
      ] as any)

      const result = await getAllFeedback()

      expect(result).toHaveLength(1)
      expect(prisma.feedback.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      })
    })

    it("должен вернуть пустой массив", async () => {
      vi.mocked(prisma.feedback.findMany).mockResolvedValue([])

      const result = await getAllFeedback()

      expect(result).toEqual([])
    })
  })

  describe("updateFeedbackStatus", () => {
    it("должен обновить статус фидбека", async () => {
      vi.mocked(prisma.feedback.update).mockResolvedValue({
        id: 1, status: "in_progress",
      } as any)

      const result = await updateFeedbackStatus(1, "in_progress")

      expect(result).toHaveProperty("status", "in_progress")
      expect(prisma.feedback.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "in_progress" },
      })
    })
  })

  describe("deleteFeedback", () => {
    it("должен удалить фидбек", async () => {
      vi.mocked(prisma.feedback.delete).mockResolvedValue({ id: 1 } as any)

      await deleteFeedback(1)

      expect(prisma.feedback.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    })
  })
})
