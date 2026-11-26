import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { redis } from "../../lib/redis.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { createPresenceService, type PresenceRedisClient } from "./presence.service.js";
import { presenceLeaveSchema, presencePingSchema } from "./presence.schema.js";
import { ErrorCodes, createApiError } from "../../lib/api-response.js";

export const presenceRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const presence = createPresenceService(fastify.prisma, redis as unknown as PresenceRedisClient);

  // sendBeacon с JSON-строкой может отправлять text/plain
  fastify.addContentTypeParser("text/plain", { parseAs: "string" }, (_req, body: string | Buffer, done) => {
    try {
      const str = typeof body === "string" ? body : body.toString();
      done(null, str ? JSON.parse(str) : {});
    } catch {
      done(null, {});
    }
  });

  fastify.post(
    "/ping",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const parsed = presencePingSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send(createApiError(ErrorCodes.VALIDATION_ERROR, "Некорректные данные presence"));
      }

      const user = (request as { user?: { userId?: number } }).user;
      const userAgent = request.headers["user-agent"];

      await presence.ping({
        userId: user?.userId ?? null,
        anonId: parsed.data.anonId,
        page: parsed.data.page,
        status: parsed.data.status,
        userAgent,
      });

      return reply.code(202).send({ ok: true });
    },
  );

  fastify.post(
    "/leave",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const parsed = presenceLeaveSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(202).send({ ok: true });
      }

      const user = (request as { user?: { userId?: number } }).user;
      await presence.leave({
        userId: user?.userId ?? null,
        anonId: parsed.data.anonId ?? null,
      });

      return reply.code(202).send({ ok: true });
    },
  );
};

export const adminPresenceRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const presence = createPresenceService(fastify.prisma, redis as unknown as PresenceRedisClient);

  fastify.get(
    "/online",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (_request, reply) => {
      const snapshot = await presence.getOnlineSnapshot();
      return reply.code(200).send({ data: snapshot });
    },
  );
};
