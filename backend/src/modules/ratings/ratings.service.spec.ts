import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    bookRating: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  }
  return { prisma: tx }
})

vi.mock("../../lib/logger.js", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}))

import { rateBook, getBookRatings, getUserBookRating } from "./ratings.service.js"
import { prisma } from "../../lib/prisma.js"

describe("ratings.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("rateBook", () => {
    it("должен создать рейтинг книги", async () => {
      vi.mocked(prisma.bookRating.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.bookRating.create).mockResolvedValue({
        id: 1, bookId: 10, userId: 1, ratings: { plot: 8.5, style: 7.0 },
      } as any)

      const result = await rateBook(10, 1, { plot: 8.5, style: 7.0 })

      expect(result).toHaveProperty("id", 1)
      expect(prisma.bookRating.create).toHaveBeenCalledWith({
        data: { bookId: 10, userId: 1, ratings: { plot: 8.5, style: 7.0 } },
      })
    })

    it("должен выбросить ошибку если рейтинг уже существует", async () => {
      vi.mocked(prisma.bookRating.findUnique).mockResolvedValue({
        id: 1, bookId: 10, userId: 1,
      } as any)

      await expect(rateBook(10, 1, { plot: 8 })).rejects.toThrow("Вы уже оценили эту книгу")
    })
  })

  describe("getBookRatings", () => {
    it("должен вернуть средние оценки книги", async () => {
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([
        { ratings: { plot: 8, style: 7 } },
        { ratings: { plot: 6, style: 9 } },
      ] as any)

      const result = await getBookRatings(10)

      expect(result).toEqual({
        count: 2,
        averages: { plot: 7, style: 8 },
        overall: 7.5,
      })
    })

    it("должен вернуть null если нет оценок", async () => {
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([])

      const result = await getBookRatings(10)

      expect(result).toBeNull()
    })

    it("должен обработать одну оценку", async () => {
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([
        { ratings: { plot: 9, style: 8, characters: 7 } },
      ] as any)

      const result = await getBookRatings(10)

      expect(result).toEqual({
        count: 1,
        averages: { plot: 9, style: 8, characters: 7 },
        overall: 8,
      })
    })
  })

  describe("getUserBookRating", () => {
    it("должен вернуть рейтинг пользователя", async () => {
      vi.mocked(prisma.bookRating.findUnique).mockResolvedValue({
        id: 1, bookId: 10, userId: 1, ratings: { plot: 8.5 },
      } as any)

      const result = await getUserBookRating(10, 1)

      expect(result).toHaveProperty("bookId", 10)
    })

    it("должен вернуть null если пользователь не оценивал", async () => {
      vi.mocked(prisma.bookRating.findUnique).mockResolvedValue(null)

      const result = await getUserBookRating(10, 1)

      expect(result).toBeNull()
    })
  })
})
