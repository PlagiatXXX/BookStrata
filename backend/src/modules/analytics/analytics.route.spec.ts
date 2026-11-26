import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import Fastify, { type FastifyInstance } from "fastify"

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
      reply.code(401).send({ error: { code: "unauthorized", message: "Необходима авторизация" } })
    }
  }),
}))

vi.mock("../../middleware/requireRole.js", () => ({
  requireRole: (...roles: string[]) => {
    return (request: any, reply: any, done: any) => {
      if (roles.includes(request.user?.role)) {
        done()
      } else {
        reply.code(403).send({ error: { code: "forbidden", message: "Нет прав доступа" } })
      }
    }
  },
}))

const mockAnalyticsService = {
  trackEvent: vi.fn().mockResolvedValue(undefined),
  trackBatch: vi.fn().mockResolvedValue(undefined),
  getEvents: vi.fn().mockResolvedValue({ events: [], total: 0 }),
  getSummary: vi.fn().mockResolvedValue({ totalEvents: 10 }),
  getMetrics: vi.fn().mockResolvedValue({ dau: 5, mau: 20 }),
  getFunnel: vi.fn().mockResolvedValue({ steps: [] }),
  getRetention: vi.fn().mockResolvedValue({ d1: 10, d7: 5, d30: 2 }),
  getTimeseries: vi.fn().mockResolvedValue({ days: 30, points: [] }),
  getInsights: vi.fn().mockResolvedValue({ days: 30, topPages: [] }),
  getUserJourney: vi.fn().mockResolvedValue({ user: null, events: [] }),
}

vi.mock("./analytics.service.js", () => ({
  createAnalyticsService: () => mockAnalyticsService,
}))

import { analyticsRoutes, adminAnalyticsRoutes } from "./analytics.route.js"

describe("Analytics Routes", () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = Fastify({ logger: false })
    app.decorate("prisma", {} as any)
    await app.register(analyticsRoutes, { prefix: "/api/analytics" })
    await app.register(adminAnalyticsRoutes, { prefix: "/api/admin/analytics" })
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  describe("Публичные роуты (/api/analytics)", () => {
    it("POST /api/analytics/track успешно принимает валидное событие", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/analytics/track",
        payload: {
          event: "page_view",
          url: "/books/dune",
          meta: { referrer: "google" },
        },
      })

      expect(response.statusCode).toBe(202)
      expect(response.json()).toEqual({ ok: true })
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "page_view",
          url: "/books/dune",
          meta: { referrer: "google" },
        }),
      )
    })

    it("POST /api/analytics/track извлекает url из referer если url в body отсутствует", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/analytics/track",
        headers: {
          referer: "https://bookstrata.ru/tier-lists/school-books?mode=view",
        },
        payload: {
          event: "session_heartbeat",
        },
      })

      expect(response.statusCode).toBe(202)
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "session_heartbeat",
          url: "/tier-lists/school-books?mode=view",
        }),
      )
    })

    it("POST /api/analytics/track передаёт undefined в url если url и referer отсутствуют", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/analytics/track",
        payload: {
          event: "session_heartbeat",
        },
      })

      expect(response.statusCode).toBe(202)
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "session_heartbeat",
          url: undefined,
        }),
      )
    })

    it("POST /api/analytics/track отклоняет невалидное тело (без event)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/analytics/track",
        payload: {
          url: "/books/dune",
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it("GET /api/analytics/events возвращает 404 (админские эндпоинты изолированы)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/analytics/events",
      })

      expect(response.statusCode).toBe(404)
    })

    it("GET /api/analytics/summary возвращает 404", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/analytics/summary",
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe("Админские роуты (/api/admin/analytics)", () => {
    it("POST /api/admin/analytics/track возвращает 404 (публичный трекер изолирован)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/analytics/track",
        payload: { event: "page_view" },
      })

      expect(response.statusCode).toBe(404)
    })

    it("GET /api/admin/analytics/events требует авторизации (401 без токена)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/events",
      })

      expect(response.statusCode).toBe(401)
    })

    it("GET /api/admin/analytics/events запрещён для обычного пользователя (403)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/events",
        headers: {
          authorization: "Bearer user-token",
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it("GET /api/admin/analytics/events разрешён для админа (200)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/events?event=login&limit=20",
        headers: {
          authorization: "Bearer admin-token",
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockAnalyticsService.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "login",
          limit: 20,
        }),
      )
    })

    it("GET /api/admin/analytics/summary разрешён для админа (200)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/summary",
        headers: {
          authorization: "Bearer admin-token",
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockAnalyticsService.getSummary).toHaveBeenCalled()
    })

    it("GET /api/admin/analytics/metrics разрешён для админа (200)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/metrics",
        headers: {
          authorization: "Bearer admin-token",
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockAnalyticsService.getMetrics).toHaveBeenCalled()
    })

    it("GET /api/admin/analytics/funnel разрешён для админа (200)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/funnel?days=14",
        headers: {
          authorization: "Bearer admin-token",
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockAnalyticsService.getFunnel).toHaveBeenCalledWith(14)
    })

    it("GET /api/admin/analytics/retention разрешён для админа (200)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/retention",
        headers: {
          authorization: "Bearer admin-token",
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockAnalyticsService.getRetention).toHaveBeenCalled()
    })

    it("POST /api/analytics/batch принимает пачку событий и возвращает 202", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/analytics/batch",
        payload: {
          events: [
            { event: "page_view", url: "/books/dune", anonymousId: "a1", sessionId: "s1" },
            { event: "export_png", meta: { mode: "download" } },
          ],
        },
      })

      expect(response.statusCode).toBe(202)
      expect(mockAnalyticsService.trackBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ event: "page_view", anonymousId: "a1", sessionId: "s1" }),
          expect.objectContaining({ event: "export_png", meta: { mode: "download" } }),
        ]),
      )
    })

    it("GET /api/admin/analytics/events отклоняет невалидный cursor (400) и парсит excludeEvents", async () => {
      const badRes = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/events?cursor=abc",
        headers: { authorization: "Bearer admin-token" },
      })
      expect(badRes.statusCode).toBe(400)

      const okRes = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/events?excludeEvents=page_view,session_start",
        headers: { authorization: "Bearer admin-token" },
      })
      expect(okRes.statusCode).toBe(200)
      expect(mockAnalyticsService.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeEvents: ["page_view", "session_start"],
        }),
      )
    })

    it("GET /api/admin/analytics/timeseries и insights доступны админу", async () => {
      const tsRes = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/timeseries?days=14",
        headers: { authorization: "Bearer admin-token" },
      })
      expect(tsRes.statusCode).toBe(200)
      expect(mockAnalyticsService.getTimeseries).toHaveBeenCalledWith(14)

      const insRes = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/insights?days=7",
        headers: { authorization: "Bearer admin-token" },
      })
      expect(insRes.statusCode).toBe(200)
      expect(mockAnalyticsService.getInsights).toHaveBeenCalledWith(7)
    })

    it("GET /api/admin/analytics/user-journey требует userId или anonymousId и отдаёт данные", async () => {
      const badRes = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/user-journey",
        headers: { authorization: "Bearer admin-token" },
      })
      expect(badRes.statusCode).toBe(400)

      const okRes = await app.inject({
        method: "GET",
        url: "/api/admin/analytics/user-journey?userId=42",
        headers: { authorization: "Bearer admin-token" },
      })
      expect(okRes.statusCode).toBe(200)
      expect(mockAnalyticsService.getUserJourney).toHaveBeenCalledWith({
        userId: 42,
        anonymousId: undefined,
      })
    })
  })
})
