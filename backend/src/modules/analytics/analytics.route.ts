import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { authMiddleware } from '../auth/auth.middleware.js'
import { requireRole } from '../../middleware/requireRole.js'
import { createAnalyticsService } from './analytics.service.js'

export const analyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const analytics = createAnalyticsService(fastify.prisma)

  // POST /api/analytics/track — запись события (авторизованные пользователи)
  fastify.post(
    '/track',
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: 'object',
          required: ['event'],
          properties: {
            event: { type: 'string', minLength: 1 },
            meta: { type: 'object' },
            url: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { userId: number }
      const body = request.body as { event: string; meta?: Record<string, unknown>; url?: string }
      const ip = request.ip
      const userAgent = request.headers['user-agent']

      // Аналитика не должна ломать запрос — fire and forget
      analytics.trackEvent({
        userId: user.userId,
        event: body.event,
        meta: body.meta,
        url: body.url || request.url,
        ip,
        userAgent,
      }).catch(() => {})

      return reply.code(202).send({ ok: true })
    },
  )

  // GET /api/admin/analytics/events — просмотр событий (только admin)
  fastify.get(
    '/events',
    {
      preHandler: [authMiddleware, requireRole('admin')],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            event: { type: 'string' },
            userId: { type: 'number' },
            search: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            limit: { type: 'number', default: 50 },
            cursor: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as {
        event?: string
        userId?: string
        search?: string
        from?: string
        to?: string
        limit?: string
        cursor?: string
      }

      const result = await analytics.getEvents({
        event: query.event,
        userId: query.userId ? Number(query.userId) : undefined,
        search: query.search,
        from: query.from,
        to: query.to,
        limit: query.limit ? Number(query.limit) : 50,
        cursor: query.cursor,
      })

      return reply.code(200).send({ data: result })
    },
  )

  // GET /api/admin/analytics/summary — сводка по событиям (только admin)
  fastify.get(
    '/summary',
    {
      preHandler: [authMiddleware, requireRole('admin')],
    },
    async (_request, reply) => {
      const result = await analytics.getSummary()
      return reply.code(200).send({ data: result })
    },
  )

  // GET /api/admin/analytics/metrics — DAU, MAU, Stickiness, Churn (только admin)
  fastify.get(
    '/metrics',
    {
      preHandler: [authMiddleware, requireRole('admin')],
    },
    async (_request, reply) => {
      const result = await analytics.getMetrics()
      return reply.code(200).send({ data: result })
    },
  )

  // GET /api/admin/analytics/funnel — воронка (регистрация → создание → публикация → шейринг)
  fastify.get(
    '/funnel',
    {
      preHandler: [authMiddleware, requireRole('admin')],
    },
    async (request, reply) => {
      const { days } = request.query as { days?: string }
      const result = await analytics.getFunnel(days ? Number(days) : 30)
      return reply.code(200).send({ data: result })
    },
  )

  // GET /api/admin/analytics/retention — Retention D1/D7/D30
  fastify.get(
    '/retention',
    {
      preHandler: [authMiddleware, requireRole('admin')],
    },
    async (_request, reply) => {
      const result = await analytics.getRetention()
      return reply.code(200).send({ data: result })
    },
  )
}
