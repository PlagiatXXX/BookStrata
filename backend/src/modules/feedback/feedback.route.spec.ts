import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import Fastify from "fastify"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    feedback: { create: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    user: { update: vi.fn() },
  }
  return { prisma: tx }
})

vi.mock("../../lib/telegramNotifier.js", () => ({
  sendTelegramFeedbackNotification: vi.fn().mockResolvedValue(true),
}))

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, _reply: any, done: any) => {
    const authHeader = request.headers.authorization
    if (authHeader === "Bearer admin-token") {
      request.user = { userId: 1, username: "admin", role: "admin" }
    } else if (authHeader === "Bearer user-token") {
      request.user = { userId: 2, username: "user", role: "user" }
    }
    done()
  }),
}))

vi.mock("../../middleware/requireRole.js", () => ({
  requireRole: (...roles: string[]) => {
    return (request: any, _reply: any, done: any) => {
      if (roles.includes(request.user?.role)) {
        done()
      } else {
        _reply.code(403).send({ error: { code: "forbidden", message: "Нет прав доступа" } })
      }
    }
  },
}))

import { feedbackRoutes } from "./feedback.route.js"

describe("Feedback Routes", () => {
  let app: ReturnType<typeof Fastify>

  async function createApp() {
    const instance = Fastify({ logger: false })
    const { prisma } = await import("../../lib/prisma.js")
    instance.decorate("prisma", prisma)

    // Имитируем парсинг токена в request.user для публичных/опциональных роутов
    instance.addHook("onRequest", async (request: any) => {
      const authHeader = request.headers.authorization
      if (authHeader === "Bearer admin-token") {
        request.user = { userId: 1, username: "admin", role: "admin" }
      } else if (authHeader === "Bearer user-token") {
        request.user = { userId: 2, username: "user", role: "user" }
      }
    })

    await instance.register(feedbackRoutes, { prefix: "/api/feedback" })
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

  describe("POST /api/feedback", () => {
    it("должен создать фидбек без авторизации", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.create).mockResolvedValue({
        id: 1, userId: null, type: "bug", message: "Тест",
      } as any)

      const res = await app.inject({
        method: "POST",
        url: "/api/feedback",
        payload: { type: "bug", message: "Тест" },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.data).toHaveProperty("id", 1)
    })

    it("должен создать фидбек с авторизацией", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.create).mockResolvedValue({
        id: 2, userId: 2, type: "feature", message: "Хочу фичу",
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValue({ id: 2 } as any)

      const res = await app.inject({
        method: "POST",
        url: "/api/feedback",
        headers: { authorization: "Bearer user-token" },
        payload: { type: "feature", message: "Хочу фичу" },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.data).toHaveProperty("id", 2)
    })

    it("должен вернуть 400 при неверных данных", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/feedback",
        payload: { type: "invalid" },
      })

      expect(res.statusCode).toBe(400)
    })

    it("должен создать отзыв типа survey с оценкой и обновить статус показа у пользователя", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      const { sendTelegramFeedbackNotification } = await import("../../lib/telegramNotifier.js")

      vi.mocked(prisma.feedback.create).mockResolvedValue({
        id: 3, userId: 2, type: "survey", message: "[Оценка: great] Классный сайт",
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValue({ id: 2 } as any)

      const res = await app.inject({
        method: "POST",
        url: "/api/feedback",
        headers: { authorization: "Bearer user-token" },
        payload: { type: "survey", rating: "great", message: "Классный сайт", pageUrl: "/rankings" },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.data).toHaveProperty("id", 3)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: expect.objectContaining({ feedbackDismissedAt: expect.any(Date) }),
        })
      )
      expect(sendTelegramFeedbackNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: "great",
          message: "Классный сайт",
          pageUrl: "/rankings",
        })
      )
    })
  })

  describe("POST /api/feedback/dismiss", () => {
    it("должен скрыть фидбек для авторизованного пользователя", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.user.update).mockResolvedValue({ id: 2 } as any)

      const res = await app.inject({
        method: "POST",
        url: "/api/feedback/dismiss",
        headers: { authorization: "Bearer user-token" },
        payload: {},
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body)).toEqual({ success: true })
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: expect.objectContaining({ feedbackDismissedAt: expect.any(Date) }),
        })
      )
    })

    it("должен успешно возвращать 200 даже для неавторизованного пользователя", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/feedback/dismiss",
        payload: {},
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body)).toEqual({ success: true })
    })
  })

  describe("GET /api/feedback", () => {
    it("должен вернуть список для админа", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.findMany).mockResolvedValue([])

      const res = await app.inject({
        method: "GET",
        url: "/api/feedback",
        headers: { authorization: "Bearer admin-token" },
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).data).toEqual([])
    })

    it("должен вернуть список с пагинацией", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.findMany).mockResolvedValue([
        { id: 1, type: "bug", message: "...", status: "pending", pageUrl: null, userEmail: null, userId: null, createdAt: "2024-01-01T00:00:00Z" } as any,
      ])

      const res = await app.inject({
        method: "GET",
        url: "/api/feedback?page=1&limit=20",
        headers: { authorization: "Bearer admin-token" },
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).data).toHaveLength(1)
    })

    it("должен вернуть 403 для обычного пользователя", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/feedback",
        headers: { authorization: "Bearer user-token" },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  describe("PATCH /api/feedback/:id", () => {
    it("должен обновить статус", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.update).mockResolvedValue({ id: 1, status: "in_progress" } as any)

      const res = await app.inject({
        method: "PATCH",
        url: "/api/feedback/1",
        headers: { authorization: "Bearer admin-token" },
        payload: { status: "in_progress" },
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).data.status).toBe("in_progress")
    })

    it("должен вернуть 404 если фидбек не найден", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.update).mockRejectedValue(new Error("Record not found"))

      const res = await app.inject({
        method: "PATCH",
        url: "/api/feedback/999",
        headers: { authorization: "Bearer admin-token" },
        payload: { status: "done" },
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe("DELETE /api/feedback/:id", () => {
    it("должен удалить фидбек", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.delete).mockResolvedValue({ id: 1 } as any)

      const res = await app.inject({
        method: "DELETE",
        url: "/api/feedback/1",
        headers: { authorization: "Bearer admin-token" },
      })

      expect(res.statusCode).toBe(204)
    })
  })
})
