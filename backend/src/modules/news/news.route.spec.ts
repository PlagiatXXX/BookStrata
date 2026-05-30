import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
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

      const res = await request(app.server)
        .get("/api/news?page=1&limit=10")
        .expect(200)

      expect(res.body.data).toHaveLength(1)
    })

    it("должен показывать только опубликованные для неавторизованных", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([])
      vi.mocked(prisma.newsArticle.count).mockResolvedValue(0)

      await request(app.server)
        .get("/api/news")
        .expect(200)

      expect(prisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      )
    })

    it("должен показывать все новости для админа", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([])
      vi.mocked(prisma.newsArticle.count).mockResolvedValue(0)

      await request(app.server)
        .get("/api/news")
        .set("Authorization", "Bearer admin-token")
        .expect(200)

      const findManyCall = vi.mocked(prisma.newsArticle.findMany).mock.calls[0]?.[0]
      expect(findManyCall?.where).toEqual({})
    })
  })

  describe("GET /api/news/published", () => {
    it("должен вернуть опубликованные новости", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findMany).mockResolvedValue([mockArticle] as any)

      const res = await request(app.server)
        .get("/api/news/published")
        .expect(200)

      expect(res.body.data).toHaveLength(1)
    })
  })

  describe("GET /api/news/:id", () => {
    it("должен вернуть новость по ID", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(mockArticle as any)

      const res = await request(app.server)
        .get("/api/news/1")
        .expect(200)

      expect(res.body.data.title).toBe("Test News")
    })

    it("должен вернуть 404 если новость не найдена", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(null)

      await request(app.server)
        .get("/api/news/999")
        .expect(404)
    })
  })

  describe("POST /api/news", () => {
    it("должен создать новость (admin)", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.create).mockResolvedValue(mockArticle as any)

      const res = await request(app.server)
        .post("/api/news")
        .set("Authorization", "Bearer admin-token")
        .send({
          title: "Test News",
          content: "Content here with enough length for validation",
          excerpt: "Excerpt",
        })
        .expect(201)

      expect(res.body.data.message).toBe("Новость создана")
    })

    it("должен вернуть 400 при неверных данных", async () => {
      await request(app.server)
        .post("/api/news")
        .set("Authorization", "Bearer admin-token")
        .send({ title: "" })
        .expect(400)
    })

    it("должен вернуть 403 без авторизации", async () => {
      await request(app.server)
        .post("/api/news")
        .send({ title: "Test", content: "x".repeat(20) })
        .expect(403)
    })
  })

  describe("PUT /api/news/:id", () => {
    it("должен обновить новость", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue({ id: "1" } as any)
      vi.mocked(prisma.newsArticle.update).mockResolvedValue(mockArticle as any)

      await request(app.server)
        .put("/api/news/1")
        .set("Authorization", "Bearer admin-token")
        .send({ title: "Updated" })
        .expect(200)
    })

    it("должен вернуть 404 если новость не найдена", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(null)

      await request(app.server)
        .put("/api/news/999")
        .set("Authorization", "Bearer admin-token")
        .send({ title: "Updated" })
        .expect(404)
    })
  })

  describe("DELETE /api/news/:id", () => {
    it("должен удалить новость", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue({ id: "1" } as any)
      vi.mocked(prisma.newsArticle.delete).mockResolvedValue({} as any)

      await request(app.server)
        .delete("/api/news/1")
        .set("Authorization", "Bearer admin-token")
        .expect(200)
    })
  })

  describe("POST /api/news/:id/publish", () => {
    it("должен опубликовать новость", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue({ id: "1" } as any)
      vi.mocked(prisma.newsArticle.update).mockResolvedValue({ ...mockArticle, isPublished: true } as any)

      const res = await request(app.server)
        .post("/api/news/1/publish")
        .set("Authorization", "Bearer admin-token")
        .send({ isPublished: true })
        .expect(200)

      expect(res.body.data.message).toBe("Статус публикации изменён")
    })
  })
})
