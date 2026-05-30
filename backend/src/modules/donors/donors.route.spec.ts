import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import Fastify from "fastify"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    donor: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
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

import { donorRoutes } from "./donors.route.js"

describe("Donors Routes", () => {
  let app: ReturnType<typeof Fastify>

  async function createApp() {
    const instance = Fastify({ logger: false })
    const { prisma } = await import("../../lib/prisma.js")
    instance.decorate("prisma", prisma)
    await instance.register(donorRoutes, { prefix: "/api/donors" })
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

  describe("GET /api/donors", () => {
    it("должен вернуть список донатеров (без авторизации)", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.donor.findMany).mockResolvedValue([
        { id: 1, name: "Иван" },
      ] as any)

      const res = await request(app.server)
        .get("/api/donors")
        .expect(200)

      expect(res.body.data).toHaveLength(1)
    })
  })

  describe("POST /api/donors", () => {
    it("должен добавить донатера (admin)", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.donor.create).mockResolvedValue({ id: 1, name: "Иван" } as any)

      const res = await request(app.server)
        .post("/api/donors")
        .set("Authorization", "Bearer admin-token")
        .send({ name: "Иван" })
        .expect(201)

      expect(res.body.data.name).toBe("Иван")
    })

    it("должен вернуть 403 для обычного пользователя", async () => {
      await request(app.server)
        .post("/api/donors")
        .set("Authorization", "Bearer user-token")
        .send({ name: "Иван" })
        .expect(403)
    })
  })

  describe("DELETE /api/donors/:id", () => {
    it("должен удалить донатера (admin)", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.donor.delete).mockResolvedValue({ id: 1 } as any)

      await request(app.server)
        .delete("/api/donors/1")
        .set("Authorization", "Bearer admin-token")
        .expect(204)
    })

    it("должен вернуть 404 если донатер не найден", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.donor.delete).mockRejectedValue(new Error("Not found"))

      await request(app.server)
        .delete("/api/donors/999")
        .set("Authorization", "Bearer admin-token")
        .expect(404)
    })
  })
})
