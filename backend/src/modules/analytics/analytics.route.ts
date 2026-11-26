import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { createAnalyticsService } from "./analytics.service.js";

const trackItemProperties = {
  // Формат: строчные a-z/0-9 + . _ : - (события data-analytics динамические)
  event: { type: "string", minLength: 1, maxLength: 64, pattern: "^[a-z0-9_.:-]+$" },
  meta: { type: "object", maxProperties: 20, additionalProperties: true },
  url: { type: "string", maxLength: 512 },
  anonymousId: { type: "string", maxLength: 128 },
  sessionId: { type: "string", maxLength: 128 },
  referrer: { type: "string", maxLength: 512 },
  utmSource: { type: "string", maxLength: 128 },
  utmMedium: { type: "string", maxLength: 128 },
  utmCampaign: { type: "string", maxLength: 128 },
};

interface TrackBodyItem {
  event: string;
  meta?: Record<string, unknown>;
  url?: string;
  anonymousId?: string;
  sessionId?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

function resolveFallbackUrl(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    const parsed = new URL(referer);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return undefined;
  }
}

export const analyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const analytics = createAnalyticsService(fastify.prisma);

  // sendBeacon может присылать батч как text/plain
  fastify.addContentTypeParser("text/plain", { parseAs: "string" }, (_req, body: string | Buffer, done) => {
    try {
      const str = typeof body === "string" ? body : body.toString();
      done(null, str ? JSON.parse(str) : {});
    } catch {
      done(null, {});
    }
  });

  // POST /api/analytics/track — запись события (публичная ручка)
  fastify.post(
    "/track",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: {
          type: "object",
          required: ["event"],
          properties: trackItemProperties,
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { userId?: number } | undefined;
      const body = request.body as TrackBodyItem;
      const ip = request.ip;
      const userAgent = request.headers["user-agent"];
      const requestUrl = body.url || resolveFallbackUrl(request.headers.referer);

      analytics
        .trackEvent({
          userId: user?.userId ?? null,
          anonymousId: body.anonymousId ?? null,
          sessionId: body.sessionId ?? null,
          event: body.event,
          meta: body.meta,
          url: requestUrl,
          ip,
          userAgent,
          referrer: body.referrer ?? null,
          utmSource: body.utmSource ?? null,
          utmMedium: body.utmMedium ?? null,
          utmCampaign: body.utmCampaign ?? null,
        })
        .catch(() => {});

      return reply.code(202).send({ ok: true });
    },
  );

  // POST /api/analytics/batch — батчевая запись до 20 событий за один запрос
  fastify.post(
    "/batch",
    {
      config: {
        rateLimit: {
          max: 120,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: {
          type: "object",
          required: ["events"],
          properties: {
            events: {
              type: "array",
              minItems: 1,
              maxItems: 20,
              items: {
                type: "object",
                required: ["event"],
                properties: trackItemProperties,
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { userId?: number } | undefined;
      const body = request.body as { events: TrackBodyItem[] };
      const ip = request.ip;
      const userAgent = request.headers["user-agent"];
      const fallbackUrl = resolveFallbackUrl(request.headers.referer);

      analytics
        .trackBatch(
          body.events.map((item) => ({
            userId: user?.userId ?? null,
            anonymousId: item.anonymousId ?? null,
            sessionId: item.sessionId ?? null,
            event: item.event,
            meta: item.meta,
            url: item.url || fallbackUrl,
            ip,
            userAgent,
            referrer: item.referrer ?? null,
            utmSource: item.utmSource ?? null,
            utmMedium: item.utmMedium ?? null,
            utmCampaign: item.utmCampaign ?? null,
          })),
        )
        .catch(() => {});

      return reply.code(202).send({ ok: true });
    },
  );
};

export const adminAnalyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const analytics = createAnalyticsService(fastify.prisma);

  // GET /api/admin/analytics/events — просмотр событий (только admin)
  fastify.get(
    "/events",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        querystring: {
          type: "object",
          properties: {
            event: { type: "string" },
            excludeEvents: { type: "string" },
            userId: { type: "number" },
            anonymousId: { type: "string" },
            sessionId: { type: "string" },
            search: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
            limit: { type: "number", default: 50 },
            cursor: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as {
        event?: string;
        excludeEvents?: string;
        userId?: string;
        anonymousId?: string;
        sessionId?: string;
        search?: string;
        from?: string;
        to?: string;
        limit?: string;
        cursor?: string;
      };

      const excludeEvents = query.excludeEvents
        ? query.excludeEvents
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const result = await analytics.getEvents({
        event: query.event,
        excludeEvents,
        userId: query.userId ? Number(query.userId) : undefined,
        anonymousId: query.anonymousId,
        sessionId: query.sessionId,
        search: query.search,
        from: query.from,
        to: query.to,
        limit: query.limit ? Number(query.limit) : 50,
        cursor: query.cursor,
      });

      return reply.code(200).send({ data: result });
    },
  );

  // GET /api/admin/analytics/summary — сводка по событиям (только admin)
  fastify.get(
    "/summary",
    {
      preHandler: [authMiddleware, requireRole("admin")],
    },
    async (_request, reply) => {
      const result = await analytics.getSummary();
      return reply.code(200).send({ data: result });
    },
  );

  // GET /api/admin/analytics/metrics — DAU, MAU, Stickiness, Churn (только admin)
  fastify.get(
    "/metrics",
    {
      preHandler: [authMiddleware, requireRole("admin")],
    },
    async (_request, reply) => {
      const result = await analytics.getMetrics();
      return reply.code(200).send({ data: result });
    },
  );

  // GET /api/admin/analytics/funnel — воронка
  fastify.get(
    "/funnel",
    {
      preHandler: [authMiddleware, requireRole("admin")],
    },
    async (request, reply) => {
      const { days } = request.query as { days?: string };
      const result = await analytics.getFunnel(days ? Number(days) : 30);
      return reply.code(200).send({ data: result });
    },
  );

  // GET /api/admin/analytics/retention — Retention D1/D7/D30 и когортная матрица
  fastify.get(
    "/retention",
    {
      preHandler: [authMiddleware, requireRole("admin")],
    },
    async (_request, reply) => {
      const result = await analytics.getRetention();
      return reply.code(200).send({ data: result });
    },
  );

  // GET /api/admin/analytics/timeseries — динамика по дням
  fastify.get(
    "/timeseries",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        querystring: {
          type: "object",
          properties: {
            days: { type: "number", minimum: 1, maximum: 365, default: 30 },
          },
        },
      },
    },
    async (request, reply) => {
      const { days } = request.query as { days?: number };
      const result = await analytics.getTimeseries(days ? Number(days) : 30);
      return reply.code(200).send({ data: result });
    },
  );

  // GET /api/admin/analytics/insights — топ страниц, поиски (в т.ч. пустые), устройства, источники, фичи
  fastify.get(
    "/insights",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        querystring: {
          type: "object",
          properties: {
            days: { type: "number", minimum: 1, maximum: 365, default: 30 },
          },
        },
      },
    },
    async (request, reply) => {
      const { days } = request.query as { days?: number };
      const result = await analytics.getInsights(days ? Number(days) : 30);
      return reply.code(200).send({ data: result });
    },
  );

  // GET /api/admin/analytics/user-journey — профиль и сквозная история действий пользователя
  fastify.get(
    "/user-journey",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        querystring: {
          type: "object",
          properties: {
            userId: { type: "number" },
            anonymousId: { type: "string", maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId, anonymousId } = request.query as {
        userId?: number;
        anonymousId?: string;
      };
      if (!userId && !anonymousId) {
        return reply.code(400).send({
          error: { code: "validation_error", message: "Укажите userId или anonymousId" },
        });
      }
      const result = await analytics.getUserJourney({
        userId: userId ? Number(userId) : undefined,
        anonymousId,
      });
      return reply.code(200).send({ data: result });
    },
  );
};
