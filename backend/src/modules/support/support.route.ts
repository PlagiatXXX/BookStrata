import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { createApiError, ErrorCodes } from "../../lib/api-response.js";
import {
  sendMessageSchema,
  adminReplySchema,
  updateThreadStatusSchema,
  threadIdParamsSchema,
  messageIdParamsSchema,
  adminThreadsQuerySchema,
  adminGetOrCreateThreadSchema,
  adminSearchUsersQuerySchema,
} from "./support.schema.js";
import {
  getUserThreadWithMessages,
  sendUserMessage,
  markThreadReadByUser,
  getAdminThreads,
  getThreadMessages,
  sendAdminReply,
  deleteMessage,
  deleteThread,
  updateThreadStatus,
  getOrCreateAdminUserThread,
  searchSupportUsers,
} from "./support.service.js";
import { sendTelegramSupportNotification } from "../../lib/telegramNotifier.js";

function extractGuestToken(request: FastifyRequest): string | null {
  const headerToken = request.headers["x-guest-token"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }
  const query = request.query as Record<string, unknown> | undefined;
  if (typeof query?.guestToken === "string" && query.guestToken.trim()) {
    return query.guestToken.trim();
  }
  const body = request.body as Record<string, unknown> | undefined;
  if (typeof body?.guestToken === "string" && body.guestToken.trim()) {
    return body.guestToken.trim();
  }
  return null;
}

export const supportRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/support/thread — получить тред пользователя или гостя
  fastify.get("/thread", async (request, reply) => {
    const user = request.user as { userId?: number } | undefined;
    const guestToken = extractGuestToken(request);

    if (!user?.userId && !guestToken) {
      return reply.send({ data: null });
    }

    const thread = await getUserThreadWithMessages({
      userId: user?.userId ?? null,
      guestToken,
    });

    return reply.send({ data: thread });
  });

  // POST /api/support/message — отправить сообщение от пользователя
  fastify.post(
    "/message",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const parsed = sendMessageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(
          createApiError(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0]?.message || "Ошибка валидации")
        );
      }

      const user = request.user as { userId?: number; username?: string } | undefined;
      const guestToken = extractGuestToken(request);

      if (!user?.userId && !guestToken) {
        return reply.code(400).send(
          createApiError(ErrorCodes.VALIDATION_ERROR, "Необходима авторизация или x-guest-token")
        );
      }

      const result = await sendUserMessage({
        userId: user?.userId ?? null,
        guestToken,
        text: parsed.data.text,
        replyToId: parsed.data.replyToId,
      });

      // Асинхронное уведомление в Telegram
      Promise.resolve(
        sendTelegramSupportNotification({
          threadId: result.thread.id,
          username: user?.username ?? null,
          userId: user?.userId ?? null,
          text: parsed.data.text,
          isGuest: !user?.userId,
        })
      ).catch((err) => {
        request.log.warn({ err }, "Не удалось отправить уведомление о сообщении в Telegram");
      });

      return reply.code(201).send({ data: result });
    }
  );

  // POST /api/support/read — сбросить непрочитанные пользователем
  fastify.post("/read", async (request, reply) => {
    const { threadId } = request.body as { threadId?: number };
    if (!threadId) {
      return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "threadId обязателен"));
    }

    const user = request.user as { userId?: number } | undefined;
    const guestToken = extractGuestToken(request);

    if (!user?.userId && !guestToken) {
      return reply.code(400).send(
        createApiError(ErrorCodes.VALIDATION_ERROR, "Необходима авторизация или x-guest-token")
      );
    }

    const updated = await markThreadReadByUser({
      threadId,
      userId: user?.userId ?? null,
      guestToken,
    });

    if (!updated) {
      return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Диалог не найден"));
    }

    return reply.send({ success: true });
  });
};

export const adminSupportRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", requireRole("admin"));

  // GET /api/admin/support/threads — список диалогов
  fastify.get("/threads", async (request, reply) => {
    const parsed = adminThreadsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(
        createApiError(ErrorCodes.VALIDATION_ERROR, "Некорректные параметры запроса")
      );
    }

    const result = await getAdminThreads(parsed.data);
    return reply.send({ data: result });
  });

  // GET /api/admin/support/threads/:id/messages — переписка в треде
  fastify.get("/threads/:id/messages", async (request, reply) => {
    const paramsParsed = threadIdParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Некорректный ID треда"));
    }

    const result = await getThreadMessages(paramsParsed.data.id);
    if (!result) {
      return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Диалог не найден"));
    }

    return reply.send({ data: result });
  });

  // POST /api/admin/support/threads/:id/reply — ответ администратора
  fastify.post("/threads/:id/reply", async (request, reply) => {
    const paramsParsed = threadIdParamsSchema.safeParse(request.params);
    const bodyParsed = adminReplySchema.safeParse(request.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      return reply.code(400).send(
        createApiError(ErrorCodes.VALIDATION_ERROR, "Некорректные данные ответа")
      );
    }

    const admin = request.user as { userId: number };
    const result = await sendAdminReply({
      threadId: paramsParsed.data.id,
      adminId: admin.userId,
      text: bodyParsed.data.text,
      replyToId: bodyParsed.data.replyToId,
    });

    return reply.code(201).send({ data: result });
  });

  // DELETE /api/admin/support/messages/:id — удаление отдельного сообщения
  fastify.delete("/messages/:id", async (request, reply) => {
    const paramsParsed = messageIdParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Некорректный ID сообщения"));
    }

    try {
      await deleteMessage(paramsParsed.data.id);
      return reply.code(204).send();
    } catch {
      return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Сообщение не найдено"));
    }
  });

  // DELETE /api/admin/support/threads/:id — полное удаление/очистка чата
  fastify.delete("/threads/:id", async (request, reply) => {
    const paramsParsed = threadIdParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Некорректный ID треда"));
    }

    try {
      await deleteThread(paramsParsed.data.id);
      return reply.code(204).send();
    } catch {
      return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Диалог не найден"));
    }
  });

  // PATCH /api/admin/support/threads/:id/status — сменить статус
  fastify.patch("/threads/:id/status", async (request, reply) => {
    const paramsParsed = threadIdParamsSchema.safeParse(request.params);
    const bodyParsed = updateThreadStatusSchema.safeParse(request.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      return reply.code(400).send(
        createApiError(ErrorCodes.VALIDATION_ERROR, "Некорректный статус")
      );
    }

    try {
      const thread = await updateThreadStatus(paramsParsed.data.id, bodyParsed.data.status);
      return reply.send({ data: thread });
    } catch {
      return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Диалог не найден"));
    }
  });

  // POST /api/admin/support/threads/get-or-create — найти или создать тред с пользователем
  fastify.post("/threads/get-or-create", async (request, reply) => {
    const parsed = adminGetOrCreateThreadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        createApiError(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0]?.message || "Некорректный ID пользователя")
      );
    }

    try {
      const result = await getOrCreateAdminUserThread(parsed.data.userId);
      return reply.send({ data: result });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Пользователь не найден") {
        return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, err.message));
      }
      throw err;
    }
  });

  // GET /api/admin/support/users/search — поиск пользователей для создания диалога
  fastify.get("/users/search", async (request, reply) => {
    const parsed = adminSearchUsersQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(
        createApiError(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0]?.message || "Параметр поиска q обязателен")
      );
    }

    const users = await searchSupportUsers(parsed.data.q);
    return reply.send({ data: users });
  });
};
