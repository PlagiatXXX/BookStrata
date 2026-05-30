import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("../../lib/cache.js", () => ({
  getFromCache: vi.fn(),
  setToCache: vi.fn(() => Promise.resolve()),
}))

vi.mock("../../lib/logger.js", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}))

vi.mock("xml2js", () => ({
  parseStringPromise: vi.fn(),
}))

import { ExternalNewsService } from "./external-news.service.js"
import { getFromCache, setToCache } from "../../lib/cache.js"
import { parseStringPromise } from "xml2js"

const mockRssXml = `
<rss version="2.0">
  <channel>
    <item>
      <title>Test Book News</title>
      <link>https://example.com/news/1</link>
      <description>A great book review</description>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <enclosure url="https://example.com/image.jpg" type="image/jpeg"/>
    </item>
    <item>
      <title>Another News</title>
      <link>https://example.com/news/2</link>
      <description>Another description</description>
      <pubDate>Tue, 02 Jan 2024 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

describe("ExternalNewsService", () => {
  let service: ExternalNewsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ExternalNewsService()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("getBooksNews", () => {
    it("должен вернуть из кеша если есть", async () => {
      const cachedNews = [
        { id: "1", title: "Cached", excerpt: "Test", imageUrl: null, url: "", source: "", lang: "en" as const, publishedAt: "" },
      ]
      vi.mocked(getFromCache).mockResolvedValue(cachedNews)

      const result = await service.getBooksNews(5)

      expect(result).toEqual(cachedNews)
      expect(parseStringPromise).not.toHaveBeenCalled()
    })

    it("должен загрузить и перемешать RSS если кеш пуст", async () => {
      vi.mocked(getFromCache).mockResolvedValue(null)

      vi.mocked(parseStringPromise).mockResolvedValue({
        rss: {
          channel: [{
            item: [
              { title: ["News 1"], link: ["https://example.com/1"], description: ["Desc 1"], pubDate: ["Mon, 01 Jan 2024 00:00:00 GMT"] },
              { title: ["News 2"], link: ["https://example.com/2"], description: ["Desc 2"], pubDate: ["Tue, 02 Jan 2024 00:00:00 GMT"] },
            ],
          }],
        },
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(mockRssXml),
      }) as any

      const result = await service.getBooksNews(3)

      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty("title")
      expect(result[0]).toHaveProperty("source")
      expect(setToCache).toHaveBeenCalled()
    })

    it("должен вернуть пустой массив при ошибке RSS", async () => {
      vi.mocked(getFromCache).mockResolvedValue(null)
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as any

      const result = await service.getBooksNews(3)

      expect(result).toEqual([])
    })

    it("должен корректно построить id из link", async () => {
      vi.mocked(getFromCache).mockResolvedValue(null)

      vi.mocked(parseStringPromise).mockResolvedValue({
        rss: {
          channel: [{
            item: [
              { title: ["Test"], link: ["https://test.com"], description: ["Desc"], pubDate: ["Mon, 01 Jan 2024 00:00:00 GMT"] },
            ],
          }],
        },
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(mockRssXml),
      }) as any

      const result = await service.getBooksNews(5)

      expect(result[0].id).toMatch(/^The Guardian-\d+$/)
    })

    it("должен извлекать изображение из enclosure", async () => {
      vi.mocked(getFromCache).mockResolvedValue(null)

      vi.mocked(parseStringPromise).mockResolvedValue({
        rss: {
          channel: [{
            item: [
              {
                title: ["With Image"],
                link: ["https://example.com"],
                description: ["Desc"],
                pubDate: ["Mon, 01 Jan 2024 00:00:00 GMT"],
                enclosure: [{ $: { url: "https://example.com/img.jpg", type: "image/jpeg" } }],
              },
            ],
          }],
        },
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(mockRssXml),
      }) as any

      const result = await service.getBooksNews(5)

      expect(result[0].imageUrl).toBe("https://example.com/img.jpg")
    })
  })
})
