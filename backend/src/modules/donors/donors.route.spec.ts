import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
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

      const res = await app.inject({
        method: "GET",
        url: "/api/donors",
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(1)
    })
  })

  describe("POST /api/donors", () => {
    it("должен добавить донатера (admin)", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.donor.create).mockResolvedValue({ id: 1, name: "Иван" } as any)

      const res = await app.inject({
        method: "POST",
        url: "/api/donors",
        headers: { authorization: "Bearer admin-token" },
        payload: { name: "Иван" },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.name).toBe("Иван")
    })

    it("должен вернуть 403 для обычного пользователя", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/donors",
        headers: { authorization: "Bearer user-token" },
        payload: { name: "Иван" },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe("DELETE /api/donors/:id", () => {
    it("должен удалить донатера (admin)", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.donor.delete).mockResolvedValue({ id: 1 } as any)

      const res = await app.inject({
        method: "DELETE",
        url: "/api/donors/1",
        headers: { authorization: "Bearer admin-token" },
      })

      expect(res.statusCode).toBe(204)
    })

    it("должен вернуть 404 если донатер не найден", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.donor.delete).mockRejectedValue(new Error("Not found"))

      const res = await app.inject({
        method: "DELETE",
        url: "/api/donors/999",
        headers: { authorization: "Bearer admin-token" },
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
