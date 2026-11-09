import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { ErrorCodes, createApiError } from "../../lib/api-response.js";
import {
  createFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  dismissFeedback,
} from "./feedback.service.js";
import { sendTelegramFeedbackNotification } from "../../lib/telegramNotifier.js";

const FEEDBACK_TYPES = ["bug", "feature", "other", "survey"] as const;
const FEEDBACK_STATUSES = [
  "pending",
  "in_progress",
  "done",
  "irrelevant",
] as const;

export async function feedbackRoutes(fastify: FastifyInstance) {
  // POST /api/feedback — отправить обратную связь (может быть без авторизации)
  fastify.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: ["type"],
          properties: {
            type: { type: "string", enum: [...FEEDBACK_TYPES] },
            rating: { type: "string", enum: ["great", "neutral", "bad"] },
            message: { type: "string", maxLength: 5000 },
            pageUrl: { type: "string", maxLength: 1000 },
            userEmail: { type: "string", maxLength: 255 },
          },
        },
      },
    },
    async (request, reply) => {
      const { type, message, rating, pageUrl, userEmail } = request.body as {
        type: string;
        message?: string;
        rating?: string;
        pageUrl?: string;
        userEmail?: string;
      };

      if (type !== "survey" && (!message || message.trim().length === 0)) {
        return reply.code(400).send({
          error: { code: "validation_error", message: "Сообщение обязательно" },
        });
      }

      const user = request.user;
      const userId = user?.userId ?? null;

      const feedback = await createFeedback({
        userId,
        type,
        message: message ?? "",
        rating,
        pageUrl: pageUrl ?? null,
        userEmail: userEmail ?? null,
      });

      // Отправляем в Telegram асинхронно
      Promise.resolve(
        sendTelegramFeedbackNotification({
          username: user?.username ?? null,
          userEmail: userEmail ?? null,
          userId,
          rating: rating ?? null,
          message: message ?? null,
          pageUrl: pageUrl ?? null,
        })
      ).catch((err) => {
        request.log.warn({ err }, "Не удалось отправить уведомление в Telegram");
      });

      return reply.code(201).send({ data: feedback });
    },
  );

  // POST /api/feedback/dismiss — скрыть опрос для пользователя
  fastify.post("/dismiss", async (request, reply) => {
    const userId = request.user?.userId ?? null;
    if (userId) {
      await dismissFeedback(userId).catch((err) => {
        request.log.warn({ err }, "Не удалось зафиксировать dismissFeedback");
      });
    }
    return reply.code(200).send({ success: true });
  });

  // GET /api/feedback — список обратной связи (только админ)
  fastify.get(
    "/",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            status: { type: "string", enum: [...FEEDBACK_STATUSES] },
            type: { type: "string", enum: [...FEEDBACK_TYPES] },
          },
        },
      },
    },
    async (request, reply) => {
      const { page = 1, limit = 50, status, type } =
        request.query as {
          page?: number;
          limit?: number;
          status?: string;
          type?: string;
        };

      const feedback = await getAllFeedback({
        skip: (page - 1) * limit,
        take: limit,
        status,
        type,
      });
      return reply.send({ data: feedback });
    },
  );

  // PATCH /api/feedback/:id — обновить статус (только админ)
  fastify.patch(
    "/:id",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer" },
          },
        },
        body: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: [...FEEDBACK_STATUSES] },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const { status } = request.body as { status: string };

      try {
        const feedback = await updateFeedbackStatus(id, status);
        return reply.send({ data: feedback });
      } catch {
        return reply.code(404).send(
          createApiError(ErrorCodes.NOT_FOUND, "Фидбек не найден"),
        );
      }
    },
  );

  // DELETE /api/feedback/:id — удалить (только админ)
  fastify.delete(
    "/:id",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };

      try {
        await deleteFeedback(id);
        return reply.code(204).send();
      } catch {
        return reply.code(404).send(
          createApiError(ErrorCodes.NOT_FOUND, "Фидбек не найден"),
        );
      }
    },
  );
}
