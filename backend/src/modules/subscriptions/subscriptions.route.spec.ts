import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import Fastify from "fastify"
import cors from "@fastify/cors"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  }
  return { prisma: tx }
})

vi.mock("../../lib/logger.js", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}))

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, reply: any, done: any) => {
    const authHeader = request.headers.authorization
    if (authHeader === "Bearer admin-token") {
      request.user = { userId: 1, username: "admin", role: "admin" }
      done()
    } else if (authHeader === "Bearer user-token") {
      request.user = { userId: 2, username: "user", role: "user" }
      done()
    } else {
      reply.code(401).send({ error: { code: "unauthorized", message: "Требуется авторизация" } })
    }
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

import { subscriptionsRoutes } from "./subscriptions.routes.js"

describe("Subscriptions Routes", () => {
  let app: ReturnType<typeof Fastify>

  async function createApp() {
    const instance = Fastify({ logger: false })
    await instance.register(cors, { origin: true })

    const { prisma } = await import("../../lib/prisma.js")
    instance.decorate("prisma", prisma)
    await instance.register(subscriptionsRoutes, { prefix: "/api/subscriptions" })
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

  describe("GET /api/subscriptions/me", () => {
    it("должен вернуть статус подписки текущего пользователя", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 2, isPro: true, proExpiresAt: new Date(Date.now() + 86400000),
      } as any)

      const res = await request(app.server)
        .get("/api/subscriptions/me")
        .set("Authorization", "Bearer user-token")
        .expect(200)

      expect(res.body.data).toHaveProperty("isPro")
    })

    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server)
        .get("/api/subscriptions/me")
        .expect(401)
    })
  })

  describe("GET /api/subscriptions/stats", () => {
    it("должен вернуть статистику для админа", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.user.count).mockResolvedValue(10)

      const res = await request(app.server)
        .get("/api/subscriptions/stats")
        .set("Authorization", "Bearer admin-token")
        .expect(200)

      expect(res.body.data).toHaveProperty("totalProUsers")
    })

    it("должен вернуть 403 для обычного пользователя", async () => {
      await request(app.server)
        .get("/api/subscriptions/stats")
        .set("Authorization", "Bearer user-token")
        .expect(403)
    })
  })

  describe("POST /api/subscriptions/activate", () => {
    it("должен активировать Pro подписку", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 1, username: "admin", isPro: false, proExpiresAt: null,
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 1, isPro: true, proExpiresAt: new Date(Date.now() + 86400000 * 30),
      } as any)

      const res = await request(app.server)
        .post("/api/subscriptions/activate")
        .set("Authorization", "Bearer admin-token")
        .send({ userId: 1, durationDays: 30 })
        .expect(200)

      expect(res.body.data.isPro).toBe(true)
    })

    it("должен вернуть 403 без прав админа", async () => {
      await request(app.server)
        .post("/api/subscriptions/activate")
        .set("Authorization", "Bearer user-token")
        .send({ userId: 1 })
        .expect(403)
    })
  })

  describe("POST /api/subscriptions/deactivate", () => {
    it("должен деактивировать Pro подписку", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 1, username: "admin", isPro: true, proExpiresAt: new Date(),
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 1, isPro: false, proExpiresAt: null,
      } as any)

      const res = await request(app.server)
        .post("/api/subscriptions/deactivate")
        .set("Authorization", "Bearer admin-token")
        .send({ userId: 1 })
        .expect(200)

      expect(res.body.data.isPro).toBe(false)
    })
  })
})
