import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import Fastify from "fastify"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    newsArticle: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  }
  return { prisma: tx }
})

vi.mock("../../lib/logger.js", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}))

vi.mock("../../lib/sanitizer.js", () => ({
  sanitize: (input: string) => input,
}))

vi.mock("../../lib/upload.js", () => ({
  uploadBase64: vi.fn(),
}))

vi.mock("../../lib/nsfw-check.js", () => ({
  assertImageAllowed: vi.fn(),
}))

vi.mock("../../lib/validators.js", () => ({
  validateImageSize: vi.fn(),
}))

vi.mock("../../middleware/requireRole.js", () => ({
  requireRole: (...roles: string[]) => {
    return (request: any, _reply: any, done: any) => {
      request.user = request.user || {}
      if (roles.includes(request.user?.role)) {
        done()
      } else {
        _reply.code(403).send({ error: { code: "forbidden", message: "Нет прав доступа" } })
      }
    }
  },
}))

import { newsRoutes } from "./news.route.js"

describe("News Routes", () => {
  let app: ReturnType<typeof Fastify>

  async function createApp() {
    const instance = Fastify({ logger: false })
    const { prisma } = await import("../../lib/prisma.js")
    instance.decorate("prisma", prisma)

    // Mock auth hook for admin/moderator roles
    instance.addHook("preHandler", (request: any, _reply: any, done: any) => {
      const authHeader = request.headers.authorization
      if (authHeader === "Bearer admin-token") {
        request.user = { userId: 1, username: "admin", role: "admin" }
      } else if (authHeader === "Bearer mod-token") {
        request.user = { userId: 2, username: "mod", role: "moderator" }
      }
      done()
    })

    await instance.register(newsRoutes, { prefix: "/api/news" })
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

  const mockArticle = {
    id: "1",
    title: "Test News",
    excerpt: "Excerpt",
    imageUrl: null,
    tags: [],
    authorId: 1,
    publishedAt: new Date().toISOString(),
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: { username: "admin" },
    authorName: "admin",
  }

  describe("GET /api/news", () => {
    it("должен вернуть список новостей", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([mockArticle] as any)
      vi.mocked(prisma.newsArticle.count).mockResolvedValue(1)

      const res = await app.inject({
        method: "GET",
        url: "/api/news?page=1&limit=10",
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(1)
    })

    it("должен показывать только опубликованные для неавторизованных", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([])
      vi.mocked(prisma.newsArticle.count).mockResolvedValue(0)

      await app.inject({
        method: "GET",
        url: "/api/news",
      })

      expect(prisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      )
    })

    it("должен показывать все новости для админа", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([])
      vi.mocked(prisma.newsArticle.count).mockResolvedValue(0)

      await app.inject({
        method: "GET",
        url: "/api/news",
        headers: { authorization: "Bearer admin-token" },
      })

      const findManyCall = vi.mocked(prisma.newsArticle.findMany).mock.calls[0]?.[0]
      expect(findManyCall?.where).toEqual({})
    })
  })

  describe("GET /api/news/published", () => {
    it("должен вернуть опубликованные новости", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([mockArticle] as any)

      const res = await app.inject({
        method: "GET",
        url: "/api/news/published",
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(1)
    })
  })

  describe("GET /api/news/:id", () => {
    it("должен вернуть новость по ID", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(mockArticle as any)

      const res = await app.inject({
        method: "GET",
        url: "/api/news/1",
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.title).toBe("Test News")
    })

    it("должен вернуть 404 если новость не найдена", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: "GET",
        url: "/api/news/999",
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe("POST /api/news", () => {
    it("должен создать новость (admin)", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.create).mockResolvedValue(mockArticle as any)

      const res = await app.inject({
        method: "POST",
        url: "/api/news",
        headers: { authorization: "Bearer admin-token" },
        payload: {
          title: "Test News",
          content: "Content here with enough length for validation",
          excerpt: "Excerpt",
        },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.message).toBe("Новость создана")
    })

    it("должен вернуть 400 при неверных данных", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/news",
        headers: { authorization: "Bearer admin-token" },
        payload: { title: "" },
      })

      expect(res.statusCode).toBe(400)
    })

    it("должен вернуть 403 без авторизации", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/news",
        payload: { title: "Test", content: "x".repeat(20) },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  describe("PUT /api/news/:id", () => {
    it("должен обновить новость", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue({ id: "1" } as any)
      vi.mocked(prisma.newsArticle.update).mockResolvedValue(mockArticle as any)

      const res = await app.inject({
        method: "PUT",
        url: "/api/news/1",
        headers: { authorization: "Bearer admin-token" },
        payload: { title: "Updated" },
      })

      expect(res.statusCode).toBe(200)
    })

    it("должен вернуть 404 если новость не найдена", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: "PUT",
        url: "/api/news/999",
        headers: { authorization: "Bearer admin-token" },
        payload: { title: "Updated" },
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe("DELETE /api/news/:id", () => {
    it("должен удалить новость", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue({ id: "1" } as any)
      vi.mocked(prisma.newsArticle.delete).mockResolvedValue({} as any)

      const res = await app.inject({
        method: "DELETE",
        url: "/api/news/1",
        headers: { authorization: "Bearer admin-token" },
      })

      expect(res.statusCode).toBe(200)
    })
  })

  describe("POST /api/news/:id/publish", () => {
    it("должен опубликовать новость", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue({ id: "1" } as any)
      vi.mocked(prisma.newsArticle.update).mockResolvedValue({ ...mockArticle, isPublished: true } as any)

      const res = await app.inject({
        method: "POST",
        url: "/api/news/1/publish",
        headers: { authorization: "Bearer admin-token" },
        payload: { isPublished: true },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.message).toBe("Статус публикации изменён")
    })
  })

  describe("POST /api/news/upload-image", () => {
    const base64 = "data:image/png;base64,iVBORw0KGgo="

    it("должен загрузить изображение и вернуть URL (admin)", async () => {
      const { uploadBase64 } = await import("../../lib/upload.js")
      const { assertImageAllowed } = await import("../../lib/nsfw-check.js")
      const { validateImageSize } = await import("../../lib/validators.js")

      vi.mocked(validateImageSize).mockReturnValue(null)
      vi.mocked(assertImageAllowed).mockResolvedValue(null)
      vi.mocked(uploadBase64).mockResolvedValue({ url: "https://cdn.example.com/news/1.webp", publicId: "1" } as any)

      const res = await app.inject({
        method: "POST",
        url: "/api/news/upload-image",
        headers: { authorization: "Bearer admin-token" },
        payload: { imageUrl: base64 },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.imageUrl).toBe("https://cdn.example.com/news/1.webp")
      expect(uploadBase64).toHaveBeenCalledWith(base64, "tiermaker-pro/news-images")
      expect(assertImageAllowed).toHaveBeenCalledWith(base64)
    })

    it("должен вернуть 400 при не-base64 данных", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/news/upload-image",
        headers: { authorization: "Bearer admin-token" },
        payload: { imageUrl: "https://example.com/pic.jpg" },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe("invalid_format")
    })

    it("должен вернуть 400 при превышении размера", async () => {
      const { validateImageSize } = await import("../../lib/validators.js")
      vi.mocked(validateImageSize).mockReturnValue("Файл слишком большой")

      const res = await app.inject({
        method: "POST",
        url: "/api/news/upload-image",
        headers: { authorization: "Bearer admin-token" },
        payload: { imageUrl: base64 },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe("validation_error")
    })

    it("должен вернуть 400 при NSFW-контенте", async () => {
      const { validateImageSize } = await import("../../lib/validators.js")
      const { assertImageAllowed } = await import("../../lib/nsfw-check.js")

      vi.mocked(validateImageSize).mockReturnValue(null)
      vi.mocked(assertImageAllowed).mockResolvedValue("Изображение содержит NSFW-контент")

      const res = await app.inject({
        method: "POST",
        url: "/api/news/upload-image",
        headers: { authorization: "Bearer admin-token" },
        payload: { imageUrl: base64 },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe("nsfw_content")
    })

    it("должен вернуть 500 при ошибке хранилища", async () => {
      const { validateImageSize } = await import("../../lib/validators.js")
      const { assertImageAllowed } = await import("../../lib/nsfw-check.js")
      const { uploadBase64 } = await import("../../lib/upload.js")

      vi.mocked(validateImageSize).mockReturnValue(null)
      vi.mocked(assertImageAllowed).mockResolvedValue(null)
      vi.mocked(uploadBase64).mockRejectedValue(new Error("S3 down"))

      const res = await app.inject({
        method: "POST",
        url: "/api/news/upload-image",
        headers: { authorization: "Bearer admin-token" },
        payload: { imageUrl: base64 },
      })

      expect(res.statusCode).toBe(500)
      expect(res.json().error.code).toBe("upload_failed")
    })

    it("должен вернуть 403 без роли", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/news/upload-image",
        payload: { imageUrl: base64 },
      })

      expect(res.statusCode).toBe(403)
    })
  })
})