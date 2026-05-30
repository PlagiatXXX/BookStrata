import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import Fastify from "fastify"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    bookRating: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
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
    it("должен создать рейтинг", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.bookRating.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.bookRating.create).mockResolvedValue({
        id: 1, bookId: 10, userId: 1, ratings: { plot: 8 },
      } as any)
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([
        { ratings: { plot: 8 } },
      ] as any)

      const res = await request(app.server)
        .post("/api/ratings")
        .set("Authorization", "Bearer user-token")
        .send({ bookId: 10, ratings: { plot: 8 } })
        .expect(201)

      expect(res.body.data.rating).toHaveProperty("id", 1)
    })

    it("должен вернуть 409 если уже оценивал", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.bookRating.findUnique).mockResolvedValue({
        id: 1, bookId: 10, userId: 1,
      } as any)

      await request(app.server)
        .post("/api/ratings")
        .set("Authorization", "Bearer user-token")
        .send({ bookId: 10, ratings: { plot: 8 } })
        .expect(409)
    })

    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server)
        .post("/api/ratings")
        .send({ bookId: 10, ratings: { plot: 8 } })
        .expect(401)
    })
  })

  describe("GET /api/ratings/:bookId", () => {
    it("должен вернуть средние оценки", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([
        { ratings: { plot: 8, style: 7 } },
      ] as any)

      const res = await request(app.server)
        .get("/api/ratings/10")
        .expect(200)

      expect(res.body.data).toHaveProperty("averages")
      expect(res.body.data).toHaveProperty("categories")
    })

    it("должен вернуть нули если нет оценок", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.bookRating.findMany).mockResolvedValue([])

      const res = await request(app.server)
        .get("/api/ratings/10")
        .expect(200)

      expect(res.body.data).toMatchObject({ count: 0, overall: 0 })
    })
  })

  describe("GET /api/ratings/:bookId/mine", () => {
    it("должен вернуть оценку текущего пользователя", async () => {
      const { prisma } = await import("../../lib/prisma.js")
      vi.mocked(prisma.bookRating.findUnique).mockResolvedValue({
        id: 1, bookId: 10, userId: 1, ratings: { plot: 8 },
      } as any)

      const res = await request(app.server)
        .get("/api/ratings/10/mine")
        .set("Authorization", "Bearer user-token")
        .expect(200)

      expect(res.body.data).toHaveProperty("ratings")
    })
  })
})
