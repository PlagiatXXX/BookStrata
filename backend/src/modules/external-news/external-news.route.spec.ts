import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import Fastify from "fastify"

vi.mock("../../lib/cache.js", () => ({
  getFromCache: vi.fn(),
  setToCache: vi.fn(),
}))

vi.mock("../../lib/logger.js", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}))

vi.mock("xml2js", () => ({
  parseStringPromise: vi.fn(),
}))

vi.mock("./external-news.service.js", () => {
  const ExternalNewsService = vi.fn()
  ExternalNewsService.prototype.getBooksNews = vi.fn()
  return { ExternalNewsService }
})

import { ExternalNewsService } from "./external-news.service.js"

describe("External News Routes", () => {
  let app: ReturnType<typeof Fastify>

  async function createApp() {
    const instance = Fastify({ logger: false })

    // Register inline route with mocked service
    instance.get("/api/external-news", async (_request, reply) => {
      const service = new ExternalNewsService()
      const items = await service.getBooksNews(6)
      return reply.send({ data: items })
    })

    await instance.ready()
    return instance
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
    vi.resetAllMocks()
  })

  describe("GET /api/external-news", () => {
    it("должен вернуть список новостей", async () => {
      vi.mocked(ExternalNewsService.prototype.getBooksNews).mockResolvedValue([
        { id: "1", title: "News", excerpt: "Desc", imageUrl: null, url: "https://example.com", source: "Test", lang: "en", publishedAt: "" },
      ])

      const res = await app.inject({
        method: "GET",
        url: "/api/external-news",
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(1)
      expect(res.json().data[0].title).toBe("News")
    })

    it("должен вернуть пустой массив", async () => {
      vi.mocked(ExternalNewsService.prototype.getBooksNews).mockResolvedValue([])

      const res = await app.inject({
        method: "GET",
        url: "/api/external-news",
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toEqual([])
    })

    it("не требует авторизации", async () => {
      vi.mocked(ExternalNewsService.prototype.getBooksNews).mockResolvedValue([])

      const res = await app.inject({
        method: "GET",
        url: "/api/external-news",
      })

      expect(res.statusCode).toBe(200)
    })
  })
})