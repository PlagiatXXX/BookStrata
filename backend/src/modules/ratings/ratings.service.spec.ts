import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    bookRating: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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
      vi.mocked(prisma.bookRating.upsert).mockResolvedValue({
        id: 1, bookId: 10, userId: 1, ratings: { plot: 8.5, style: 7.0 },
      } as any)

      const result = await rateBook(10, 1, { plot: 8.5, style: 7.0 })

      expect(result).toHaveProperty("id", 1)
      expect(prisma.bookRating.upsert).toHaveBeenCalledWith({
        where: { bookId_userId: { bookId: 10, userId: 1 } },
        create: { bookId: 10, userId: 1, ratings: { plot: 8.5, style: 7.0 } },
        update: { ratings: { plot: 8.5, style: 7.0 } },
      })
    })

    it("должен обновить существующий рейтинг", async () => {
      vi.mocked(prisma.bookRating.upsert).mockResolvedValue({
        id: 1, bookId: 10, userId: 1, ratings: { plot: 8 },
      } as any)

      const result = await rateBook(10, 1, { plot: 8 })

      expect(result).toHaveProperty("id", 1)
      expect(prisma.bookRating.upsert).toHaveBeenCalledWith({
        where: { bookId_userId: { bookId: 10, userId: 1 } },
        create: { bookId: 10, userId: 1, ratings: { plot: 8 } },
        update: { ratings: { plot: 8 } },
      })
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

    it("пользовательские голоса (overall) не смешиваются с редакторскими категориями", async () => {
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([
        { ratings: { plot: 8, style: 7 } }, // редактор
        { ratings: { overall: 5 } },        // пользователь 1
        { ratings: { overall: 7 } },        // пользователь 2
      ] as any)

      const result = await getBookRatings(10)

      expect(result).toEqual({
        count: 2,
        averages: { plot: 8, style: 7 },
        overall: 6,
      })
    })

    it("только пользовательские голоса: overall = их среднее, averages пуст", async () => {
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([
        { ratings: { overall: 8 } },
        { ratings: { overall: 6.5 } },
      ] as any)

      const result = await getBookRatings(10)

      expect(result).toEqual({
        count: 2,
        averages: {},
        overall: 7.3,
      })
    })

    it("оценка редакции усредняется с голосами пользователей (начальная точка)", async () => {
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([
        { ratings: { overall: 5 } },
        { ratings: { overall: 7 } },
      ] as any)

      // админ поставил 8.4: (8.4 + 5 + 7) / 3 = 6.8
      const result = await getBookRatings(10, 8.4)

      expect(result).toEqual({
        count: 2,
        averages: {},
        overall: 6.8,
      })
    })

    it("без пользовательских голосов overall = оценка редакции", async () => {
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([] as any)

      const result = await getBookRatings(10, 8.4)

      expect(result).toEqual({
        count: 0,
        averages: {},
        overall: 8.4,
      })
    })

    it("без оценок и без админской — null (как раньше)", async () => {
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([] as any)

      const result = await getBookRatings(10)

      expect(result).toBeNull()
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
