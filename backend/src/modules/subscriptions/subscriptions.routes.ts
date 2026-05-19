import type { FastifyPluginAsync } from "fastify";
import { z } from "zod/v3";
import { zodToJsonSchema } from "zod-to-json-schema";
import { createLogger } from "../../lib/logger.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { SubscriptionsService } from "./subscriptions.service.js";
import { ErrorCodes, createApiError } from "../../lib/api-response.js";

const logger = createLogger("Subscriptions", { color: "cyan" });

const errorSchema = z.object({
  error: z.string(),
});

const subscriptionStatsSchema = z.object({
  totalProUsers: z.number(),
  activeSubscriptions: z.number(),
  lifetimeSubscriptions: z.number(),
  expiringSoon: z.number(),
});

const subscriptionResponseSchema = z.object({
  userId: z.number(),
  isPro: z.boolean(),
  proExpiresAt: z.string().datetime().nullable(),
});

const mySubscriptionResponseSchema = z.object({
  isPro: z.boolean(),
  proExpiresAt: z.string().datetime().nullable(),
});

const setProStatusSchema = z.object({
  userId: z.number().int().positive(),
  isPro: z.boolean(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const activateProSchema = z.object({
  userId: z.number().int().positive(),
  durationDays: z.number().int().positive().default(30),
});

const activateProResponseSchema = subscriptionResponseSchema.extend({
  proExpiresAt: z.string().datetime(),
});

const deactivateProSchema = z.object({
  userId: z.number().int().positive(),
});

const deactivateProResponseSchema = z.object({
  userId: z.number(),
  isPro: z.boolean(),
  proExpiresAt: z.null(),
});


export const subscriptionsRoutes: FastifyPluginAsync = async (fastify) => {
  const subscriptionsService = new SubscriptionsService();

  fastify.get(
    "/stats",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        response: {
          200: zodToJsonSchema(subscriptionStatsSchema),
          401: zodToJsonSchema(errorSchema),
          403: zodToJsonSchema(errorSchema),
        },
      },
    },
    async () => {
      return subscriptionsService.getSubscriptionStats();
    },
  );

  fastify.get(
    "/user/:userId",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        params: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: { type: "string" },
          },
        },
        response: {
          200: zodToJsonSchema(subscriptionResponseSchema),
          401: zodToJsonSchema(errorSchema),
          403: zodToJsonSchema(errorSchema),
          404: zodToJsonSchema(errorSchema),
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send(createApiError(ErrorCodes.AUTHENTICATION_REQUIRED, "Требуется авторизация"));
      }
      const userId = Number((request.params as { userId: string }).userId);
      const subscription = await subscriptionsService.getUserSubscription(userId);

      if (!subscription) {
        return reply
          .code(404)
          .send(createApiError(ErrorCodes.USER_NOT_FOUND, "Пользователь не найден"));
      }

      return {
        userId: subscription.userId,
        isPro: subscription.isPro,
        proExpiresAt: subscription.proExpiresAt?.toISOString() ?? null,
      };
    },
  );

  fastify.post(
    "/set-status",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        body: zodToJsonSchema(setProStatusSchema),
        response: {
          200: zodToJsonSchema(subscriptionResponseSchema),
          400: zodToJsonSchema(errorSchema),
          401: zodToJsonSchema(errorSchema),
          403: zodToJsonSchema(errorSchema),
          404: zodToJsonSchema(errorSchema),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof setProStatusSchema>;

      try {
        const result = await subscriptionsService.setProStatus({
          userId: body.userId,
          isPro: body.isPro,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        });

        return {
          userId: result.userId,
          isPro: result.isPro,
          proExpiresAt: result.proExpiresAt?.toISOString() ?? null,
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('не найден')) {
          return reply.code(404).send({ error: error.message });
        }

        logger.error(
          error instanceof Error ? error : new Error(String(error)),
          { action: "setProStatus" },
        );

        return reply
          .code(400)
          .send({ error: "Ошибка при обновлении статуса" });
      }
    },
  );

  fastify.post(
    "/activate",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        body: zodToJsonSchema(activateProSchema),
        response: {
          200: zodToJsonSchema(activateProResponseSchema),
          400: zodToJsonSchema(errorSchema),
          401: zodToJsonSchema(errorSchema),
          403: zodToJsonSchema(errorSchema),
          404: zodToJsonSchema(errorSchema),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof activateProSchema>;

      try {
        const result = await subscriptionsService.activatePro(
          body.userId,
          body.durationDays,
        );

        return {
          userId: result.userId,
          isPro: result.isPro,
          proExpiresAt: result.proExpiresAt!.toISOString(),
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("не найден")) {
          return reply.code(404).send({ error: error.message });
        }

        logger.error(
          error instanceof Error ? error : new Error(String(error)),
          { action: "activatePro" },
        );

        return reply
          .code(400)
          .send({ error: "Ошибка при активации подписки" });
      }
    },
  );

  fastify.post(
    "/deactivate",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        body: zodToJsonSchema(deactivateProSchema),
        response: {
          200: zodToJsonSchema(deactivateProResponseSchema),
          400: zodToJsonSchema(errorSchema),
          401: zodToJsonSchema(errorSchema),
          403: zodToJsonSchema(errorSchema),
          404: zodToJsonSchema(errorSchema),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof deactivateProSchema>;

      try {
        const result = await subscriptionsService.deactivatePro(body.userId);

        return {
          userId: result.userId,
          isPro: result.isPro,
          proExpiresAt: null,
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("не найден")) {
          return reply.code(404).send({ error: error.message });
        }

        logger.error(
          error instanceof Error ? error : new Error(String(error)),
          { action: "deactivatePro" },
        );

        return reply
          .code(400)
          .send({ error: "Ошибка при активации подписки" });
      }
    },
  );

  fastify.get(
    "/me",
    {
      preHandler: [authMiddleware],
      schema: {
        response: {
          200: zodToJsonSchema(mySubscriptionResponseSchema),
          401: zodToJsonSchema(errorSchema),
          404: zodToJsonSchema(errorSchema),
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send(createApiError(ErrorCodes.AUTHENTICATION_REQUIRED, "Требуется авторизация"));
      }

      const userId = user.userId;
      const subscription = await subscriptionsService.getUserSubscription(userId)

      if (!subscription) {
        return reply
          .code(404)
          .send(createApiError(ErrorCodes.USER_NOT_FOUND, "Пользователь не найден"));
      }

      return {
        isPro: subscription.isPro,
        proExpiresAt: subscription.proExpiresAt?.toISOString() ?? null,
      };
    },
  );
};

export default subscriptionsRoutes;
