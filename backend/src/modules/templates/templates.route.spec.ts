import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import Fastify, { type FastifyInstance } from "fastify"

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, reply: any, done: any) => {
    const authHeader = request.headers.authorization
    if (authHeader === "Bearer user-token") {
      request.user = { userId: 42, username: "testuser", role: "user" }
      done()
    } else {
      reply.code(401).send({ error: "Unauthorized" })
    }
  }),
}))

const mockTemplatesService = {
  getUserTemplates: vi.fn().mockResolvedValue([{ id: "tpl-1", title: "My Template" }]),
  getAllTemplates: vi.fn().mockResolvedValue([{ id: "tpl-1", title: "My Template" }]),
  createTemplate: vi.fn().mockResolvedValue({ id: "tpl-2", title: "New Template" }),
  getTemplateById: vi.fn().mockImplementation((id: string) => {
    if (id === "tpl-1") return Promise.resolve({ id: "tpl-1", title: "My Template" })
    return Promise.resolve(null)
  }),
  updateTemplate: vi.fn().mockResolvedValue({ id: "tpl-1", title: "Updated Template" }),
  deleteTemplate: vi.fn().mockResolvedValue(undefined),
  useTemplate: vi.fn().mockResolvedValue({ id: "tier-1", title: "New Tier List" }),
}

vi.mock("./templates.service.js", () => {
  return {
    TemplatesService: class {
      constructor() {
        return mockTemplatesService
      }
    },
  }
})

vi.mock("./likes/likes.service.js", () => ({
  getLikesWithStatus: vi.fn().mockResolvedValue({ count: 5, isLiked: false }),
  like: vi.fn().mockResolvedValue({ count: 6, isLiked: true }),
  unlike: vi.fn().mockResolvedValue({ success: true }),
}))

import { templatesRoutes } from "./templates.route.js"

describe("Templates Routes", () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = Fastify({ logger: false })
    app.decorate("prisma", {} as any)
    await app.register(templatesRoutes, { prefix: "/api" })
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  describe("Авторизация", () => {
    it("GET /api/templates без токена возвращает 401", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/templates",
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe("CRUD шаблонов", () => {
    const authHeaders = { authorization: "Bearer user-token" }

    it("GET /api/templates возвращает шаблоны пользователя", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/templates",
        headers: authHeaders,
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual([{ id: "tpl-1", title: "My Template" }])
      expect(mockTemplatesService.getUserTemplates).toHaveBeenCalledWith("42")
    })

    it("GET /api/templates/all возвращает все доступные шаблоны", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/templates/all",
        headers: authHeaders,
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual([{ id: "tpl-1", title: "My Template" }])
      expect(mockTemplatesService.getAllTemplates).toHaveBeenCalledWith("42")
    })

    it("POST /api/templates создает шаблон", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/templates",
        headers: authHeaders,
        payload: {
          title: "New Template",
          tiers: [{ id: "t1", name: "S", color: "#ff0000", order: 0 }],
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ id: "tpl-2", title: "New Template" })
      expect(mockTemplatesService.createTemplate).toHaveBeenCalled()
    })

    it("GET /api/templates/:id возвращает существующий шаблон", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/templates/tpl-1",
        headers: authHeaders,
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ id: "tpl-1", title: "My Template" })
    })

    it("GET /api/templates/:id возвращает 404 для несуществующего шаблона", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/templates/non-existent",
        headers: authHeaders,
      })

      expect(response.statusCode).toBe(404)
    })

    it("PUT /api/templates/:id обновляет шаблон", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/templates/tpl-1",
        headers: authHeaders,
        payload: { title: "Updated Template" },
      })

      expect(response.statusCode).toBe(200)
      expect(mockTemplatesService.updateTemplate).toHaveBeenCalledWith("tpl-1", { title: "Updated Template" }, "42")
    })

    it("DELETE /api/templates/:id удаляет шаблон", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/templates/tpl-1",
        headers: authHeaders,
      })

      expect(response.statusCode).toBe(204)
      expect(mockTemplatesService.deleteTemplate).toHaveBeenCalledWith("tpl-1", "42")
    })

    it("POST /api/templates/:id/use применяет шаблон", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/templates/tpl-1/use",
        headers: authHeaders,
        payload: { newListTitle: "My new rating" },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ id: "tier-1", title: "New Tier List" })
      expect(mockTemplatesService.useTemplate).toHaveBeenCalledWith("tpl-1", "42", "My new rating")
    })
  })

  describe("Лайки шаблонов (проверка правильного пути /api/templates/:id/likes)", () => {
    const authHeaders = { authorization: "Bearer user-token" }

    it("GET /api/templates/:id/likes отдает статус лайков", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/templates/tpl-1/likes",
        headers: authHeaders,
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ data: { count: 5, isLiked: false } })
    })

    it("POST /api/templates/:id/like ставит лайк", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/templates/tpl-1/like",
        headers: authHeaders,
      })

      expect(response.statusCode).toBe(200)
    })

    it("DELETE /api/templates/:id/like снимает лайк", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/templates/tpl-1/like",
        headers: authHeaders,
      })

      expect(response.statusCode).toBe(200)
    })
  })
})
