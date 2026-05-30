import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    newsArticle: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  }
  return { prisma: tx }
})

vi.mock("../../lib/logger.js", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}))

vi.mock("../../lib/sanitizer.js", () => ({
  sanitize: (input: string) => input,
}))

import { NewsService } from "./news.service.js"
import { prisma } from "../../lib/prisma.js"

describe("NewsService", () => {
  let service: NewsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new NewsService()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const mockArticle = {
    id: "1",
    title: "Test News",
    excerpt: "Test excerpt",
    imageUrl: "https://example.com/image.jpg",
    tags: ["tag1"],
    authorId: 1,
    publishedAt: new Date(),
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { username: "admin" },
  }

  describe("getAllNews", () => {
    it("должен вернуть пагинированный список новостей", async () => {
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([mockArticle] as any)
      vi.mocked(prisma.newsArticle.count).mockResolvedValue(1)

      const result = await service.getAllNews({ page: 1, limit: 10 })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].authorName).toBe("admin")
      expect(result.meta).toEqual({
        total: 1,
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 10,
      })
      expect(result.links.self).toBeDefined()
    })

    it("должен вернуть пустой список", async () => {
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([])
      vi.mocked(prisma.newsArticle.count).mockResolvedValue(0)

      const result = await service.getAllNews()

      expect(result.data).toEqual([])
      expect(result.meta.total).toBe(0)
    })

    it("должен фильтровать только опубликованные", async () => {
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([])
      vi.mocked(prisma.newsArticle.count).mockResolvedValue(0)

      await service.getAllNews({ publishedOnly: true })

      expect(prisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true },
        }),
      )
    })

    it("должен рассчитать ссылки пагинации", async () => {
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue(
        Array(5).fill(mockArticle) as any,
      )
      vi.mocked(prisma.newsArticle.count).mockResolvedValue(25)

      const result = await service.getAllNews({ page: 2, limit: 5 })

      expect(result.links.next).toContain("page=3")
      expect(result.links.prev).toContain("page=1")
      expect(result.links.last).toContain("page=5")
    })
  })

  describe("getPublishedNews", () => {
    it("должен вернуть опубликованные новости", async () => {
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([mockArticle] as any)

      const result = await service.getPublishedNews(10)

      expect(result).toHaveLength(1)
      expect(prisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true },
          take: 10,
        }),
      )
    })
  })

  describe("getNewsById", () => {
    it("должен вернуть новость по ID", async () => {
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(mockArticle as any)

      const result = await service.getNewsById("1")

      expect(result).not.toBeNull()
      expect(result!.title).toBe("Test News")
      expect(result!.authorName).toBe("admin")
    })

    it("должен вернуть null если новость не найдена", async () => {
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(null)

      const result = await service.getNewsById("999")

      expect(result).toBeNull()
    })

    it("должен учитывать publishedOnly", async () => {
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(null)

      await service.getNewsById("1", { publishedOnly: false })

      expect(prisma.newsArticle.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "1" },
        }),
      )
    })
  })

  describe("createNews", () => {
    it("должен создать новость", async () => {
      vi.mocked(prisma.newsArticle.create).mockResolvedValue(mockArticle as any)

      const result = await service.createNews({
        title: "Test News",
        content: "Content here",
        excerpt: "Excerpt",
        tags: [],
        isPublished: true,
      }, 1)

      expect(result).not.toBeNull()
      expect(result.title).toBe("Test News")
      expect(prisma.newsArticle.create).toHaveBeenCalled()
    })

    it("должен выбросить ошибку при невалидных данных", async () => {
      await expect(service.createNews({
        title: "",
        content: "x",
        excerpt: "",
        tags: [],
        isPublished: false,
      }, 1)).rejects.toThrow()
    })
  })

  describe("updateNews", () => {
    it("должен обновить новость", async () => {
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue({ id: "1" } as any)
      vi.mocked(prisma.newsArticle.update).mockResolvedValue({ ...mockArticle, title: "Updated" } as any)

      const result = await service.updateNews("1", { title: "Updated" })

      expect(result).not.toBeNull()
      expect(result!.title).toBe("Updated")
    })

    it("должен вернуть null если новость не найдена", async () => {
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(null)

      const result = await service.updateNews("999", { title: "Updated" })

      expect(result).toBeNull()
    })

    it("должен обработать imageUrl = '' как null", async () => {
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue({ id: "1" } as any)
      vi.mocked(prisma.newsArticle.update).mockResolvedValue(mockArticle as any)

      await service.updateNews("1", { imageUrl: "" })

      expect(prisma.newsArticle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ imageUrl: null }),
        }),
      )
    })
  })

  describe("deleteNews", () => {
    it("должен удалить новость и вернуть true", async () => {
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue({ id: "1" } as any)
      vi.mocked(prisma.newsArticle.delete).mockResolvedValue({ id: "1" } as any)

      const result = await service.deleteNews("1")

      expect(result).toBe(true)
    })

    it("должен вернуть false если новость не найдена", async () => {
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(null)

      const result = await service.deleteNews("999")

      expect(result).toBe(false)
      expect(prisma.newsArticle.delete).not.toHaveBeenCalled()
    })
  })

  describe("togglePublish", () => {
    it("должен опубликовать новость", async () => {
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue({ id: "1" } as any)
      vi.mocked(prisma.newsArticle.update).mockResolvedValue({ ...mockArticle, isPublished: true } as any)

      const result = await service.togglePublish("1", true)

      expect(result).not.toBeNull()
      expect(result!.isPublished).toBe(true)
    })

    it("должен вернуть null если новость не найдена", async () => {
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(null)

      const result = await service.togglePublish("999", true)

      expect(result).toBeNull()
    })
  })
})
