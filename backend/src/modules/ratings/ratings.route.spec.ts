import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import Fastify from "fastify"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    book: { findUnique: vi.fn() },
    bookRating: { findUnique: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
  }
  return { prisma: tx }
})

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, reply: any, done: any) => {
    const authHeader = request.headers.authorization
    if (authHeader === "Bearer user-token") {
      request.user = { userId: 1, username: "test", role: "user" }
      done()
    } else {
      reply.code(401).send({ error: { code: "unauthorized", message: "Требуется авторизация" } })
    }
  }),
}))

import { ratingsRoutes } from "./ratings.route.js"

describe("Ratings Routes", () => {
  let app: ReturnType<typeof Fastify>

  async function createApp() {
    const instance = Fastify({ logger: false })
    const { prisma } = await import("../../lib/prisma.js")
    instance.decorate("prisma", prisma)
    await instance.register(ratingsRoutes, { prefix: "/api/ratings" })
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

  describe("POST /api/ratings", () => {
    it("должен создать или обновить рейтинг", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.bookRating.upsert).mockResolvedValue({
        id: 1, bookId: 10, userId: 1, ratings: { plot: 8 },
      } as any)
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([
        { ratings: { plot: 8 } },
      ] as any)

      const res = await app.inject({
        method: "POST",
        url: "/api/ratings",
        headers: { authorization: "Bearer user-token" },
        payload: { bookId: 10, ratings: { plot: 8 } },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.rating).toHaveProperty("id", 1)
    })

    it("должен обновить рейтинг при повторной отправке (upsert)", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.bookRating.upsert).mockResolvedValue({
        id: 1, bookId: 10, userId: 1, ratings: { plot: 9 },
      } as any)
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([
        { ratings: { plot: 9 } },
      ] as any)

      const res = await app.inject({
        method: "POST",
        url: "/api/ratings",
        headers: { authorization: "Bearer user-token" },
        payload: { bookId: 10, ratings: { plot: 9 } },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.rating).toHaveProperty("ratings")
      expect(res.json().data.rating.ratings).toEqual({ plot: 9 })
    })

    it("должен вернуть 401 без авторизации", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/ratings",
        payload: { bookId: 10, ratings: { plot: 8 } },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe("GET /api/ratings/:bookId", () => {
    it("должен вернуть средние оценки", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.book.findUnique).mockResolvedValue({ rating: 8.4 } as any)
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([
        { ratings: { plot: 8, style: 7 } },
      ] as any)

      const res = await app.inject({
        method: "GET",
        url: "/api/ratings/10",
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveProperty("averages")
      expect(res.json().data).toHaveProperty("categories")
    })

    it("должен вернуть нули если нет оценок", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.book.findUnique).mockResolvedValue({ rating: null } as any)
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([])

      const res = await app.inject({
        method: "GET",
        url: "/api/ratings/10",
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toMatchObject({ count: 0, overall: 0 })
    })
  })

  describe("GET /api/ratings/:bookId/mine", () => {
    it("должен вернуть оценку текущего пользователя", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.bookRating.findUnique).mockResolvedValue({
        id: 1, bookId: 10, userId: 1, ratings: { plot: 8 },
      } as any)

      const res = await app.inject({
        method: "GET",
        url: "/api/ratings/10/mine",
        headers: { authorization: "Bearer user-token" },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveProperty("ratings")
    })
  })
})