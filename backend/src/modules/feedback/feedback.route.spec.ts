import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import Fastify from "fastify"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    feedback: { create: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
  }
  return { prisma: tx }
})

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

      const res = await request(app.server)
        .post("/api/feedback")
        .send({ type: "bug", message: "Тест" })
        .expect(201)

      expect(res.body.data).toHaveProperty("id", 1)
    })

    it("должен создать фидбек с авторизацией", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.create).mockResolvedValue({
        id: 2, userId: 2, type: "feature", message: "Хочу фичу",
      } as any)

      const res = await request(app.server)
        .post("/api/feedback")
        .set("Authorization", "Bearer user-token")
        .send({ type: "feature", message: "Хочу фичу" })
        .expect(201)

      expect(res.body.data).toHaveProperty("id", 2)
    })

    it("должен вернуть 400 при неверных данных", async () => {
      await request(app.server)
        .post("/api/feedback")
        .send({ type: "invalid" })
        .expect(400)
    })
  })

  describe("GET /api/feedback", () => {
    it("должен вернуть список для админа", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.findMany).mockResolvedValue([])

      const res = await request(app.server)
        .get("/api/feedback")
        .set("Authorization", "Bearer admin-token")
        .expect(200)

      expect(res.body.data).toEqual([])
    })

    it("должен вернуть 403 для обычного пользователя", async () => {
      await request(app.server)
        .get("/api/feedback")
        .set("Authorization", "Bearer user-token")
        .expect(403)
    })
  })

  describe("PATCH /api/feedback/:id", () => {
    it("должен обновить статус", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.update).mockResolvedValue({
        id: 1, status: "in_progress",
      } as any)

      const res = await request(app.server)
        .patch("/api/feedback/1")
        .set("Authorization", "Bearer admin-token")
        .send({ status: "in_progress" })
        .expect(200)

      expect(res.body.data.status).toBe("in_progress")
    })

    it("должен вернуть 404 если фидбек не найден", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.update).mockRejectedValue(new Error("Not found"))

      await request(app.server)
        .patch("/api/feedback/999")
        .set("Authorization", "Bearer admin-token")
        .send({ status: "done" })
        .expect(404)
    })
  })

  describe("DELETE /api/feedback/:id", () => {
    it("должен удалить фидбек", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.feedback.delete).mockResolvedValue({ id: 1 } as any)

      await request(app.server)
        .delete("/api/feedback/1")
        .set("Authorization", "Bearer admin-token")
        .expect(204)
    })
  })
})
