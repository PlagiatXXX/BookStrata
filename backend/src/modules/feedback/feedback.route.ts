import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { ErrorCodes, createApiError } from "../../lib/api-response.js";
import {
  createFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  deleteFeedback,
} from "./feedback.service.js";

const FEEDBACK_TYPES = ["bug", "feature", "other"] as const;
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
          required: ["type", "message"],
          properties: {
            type: { type: "string", enum: [...FEEDBACK_TYPES] },
            message: { type: "string", minLength: 1, maxLength: 5000 },
            pageUrl: { type: "string", maxLength: 1000 },
            userEmail: { type: "string", maxLength: 255 },
          },
        },
      },
    },
    async (request, reply) => {
      const { type, message, pageUrl, userEmail } = request.body as {
        type: string;
        message: string;
        pageUrl?: string;
        userEmail?: string;
      };

      const userId = (request as any).user?.userId ?? null;

      const feedback = await createFeedback({
        userId,
        type,
        message,
        pageUrl: pageUrl ?? null,
        userEmail: userEmail ?? null,
      });

      return reply.code(201).send({ data: feedback });
    },
  );

  // GET /api/feedback — список обратной связи (только админ)
  fastify.get(
    "/",
    {
      preHandler: [authMiddleware, requireRole("admin")],
    },
    async (_request, reply) => {
      const feedback = await getAllFeedback();
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
