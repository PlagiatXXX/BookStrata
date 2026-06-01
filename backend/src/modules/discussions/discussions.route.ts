import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import { authMiddleware } from "../auth/auth.middleware.js"
import * as service from "./discussions.service.js"
import type { CreateMessageBody, UpdateMessageBody } from "./discussions.schema.js"
import { ErrorCodes, createApiError, createSuccessResponse, createPaginatedResponse } from "../../lib/api-response.js"

export async function discussionRoutes(fastify: FastifyInstance) {
  // GET /api/discussions/topics — список топиков форума
  fastify.get("/topics", async (request, reply) => {
    const topics = await service.getTopics()
    return reply.send(createSuccessResponse(topics))
  })

  // POST /api/discussions/topics — создать топик
  fastify.post<{ Body: { title: string } }>(
    "/topics",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { title } = request.body
      if (!title || !title.trim()) {
        return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Title is required"))
      }
      const topic = await service.createTopic(title.trim(), request.user!.userId)
      return reply.code(201).send(createSuccessResponse(topic))
    },
  )

  // PATCH /api/discussions/topics/:id/pin — закрепить/открепить топик (админ/модератор)
  fastify.patch<{ Params: { id: string } }>(
    "/topics/:id/pin",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const role = request.user!.role
      if (role !== "admin" && role !== "moderator") {
        return reply.code(403).send(createApiError(ErrorCodes.FORBIDDEN, "Только админ или модератор может закреплять темы"))
      }
      try {
        const topic = await service.pinTopic(request.params.id)
        return reply.send(createSuccessResponse(topic))
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message === "Topic not found") {
            return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, err.message))
          }
        }
        throw err
      }
    },
  )

  // DELETE /api/discussions/topics/:id — удалить топик (админ/модератор)
  fastify.delete<{ Params: { id: string } }>(
    "/topics/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const role = request.user!.role
      if (role !== "admin" && role !== "moderator") {
        return reply.code(403).send(createApiError(ErrorCodes.FORBIDDEN, "Только админ или модератор может удалять темы"))
      }
      try {
        await service.deleteTopic(request.params.id)
        return reply.code(204).send()
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "Topic not found") {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, err.message))
        }
        throw err
      }
    },
  )

  // GET /api/discussions/general — получить общий чат (создаётся при первом обращении)
  fastify.get(
    "/general",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const discussion = await service.getOrCreateGeneralDiscussion()
      return reply.send(createSuccessResponse(discussion))
    },
  )

  // GET /api/discussions/battle/:battleId — получить обсуждение для битвы
  fastify.get<{ Params: { battleId: string } }>(
    "/battle/:battleId",
    async (request, reply) => {
      const discussion = await service.getDiscussionByBattle(request.params.battleId)
      if (!discussion) {
        return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Discussion not found for this battle"))
      }
      return reply.send(createSuccessResponse(discussion))
    },
  )

  // GET /api/discussions/:id — получить обсуждение по ID
  fastify.get<{ Params: { id: string } }>(
    "/:id",
    async (request, reply) => {
      const discussion = await service.getDiscussionById(request.params.id)
      if (!discussion) {
        return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Discussion not found"))
      }
      return reply.send(createSuccessResponse(discussion))
    },
  )

  // POST /api/discussions — создать обсуждение (с battleId)
  fastify.post<{ Body: { battleId: string; title?: string } }>(
    "/",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { battleId, title } = request.body
      const discussion = await service.createDiscussion(battleId, title)
      return reply.code(201).send(createSuccessResponse(discussion))
    },
  )

  // GET /api/discussions/:id/messages — список сообщений (пагинация)
  fastify.get<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>(
    "/:id/messages",
    async (request, reply) => {
      const { page = 1, limit = 50 } = request.query
      const result = await service.getMessages(request.params.id, page, limit)
      const totalPages = Math.ceil(result.total / limit)
      return reply.send(
        createPaginatedResponse(result.messages, {
          totalItems: result.total,
          totalPages,
          currentPage: page,
          itemCount: result.messages.length,
          itemsPerPage: limit,
        }, {
          self: `/api/discussions/${request.params.id}/messages?page=${page}&limit=${limit}`,
          ...(page < totalPages ? { next: `/api/discussions/${request.params.id}/messages?page=${page + 1}&limit=${limit}` } : {}),
          ...(page > 1 ? { prev: `/api/discussions/${request.params.id}/messages?page=${page - 1}&limit=${limit}` } : {}),
          last: `/api/discussions/${request.params.id}/messages?page=${totalPages}&limit=${limit}`,
        }),
      )
    },
  )

  // Проверка бана в чате
  const checkChatBan = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user!.userId },
      select: { chatBannedAt: true, chatBannedUntil: true },
    })
    if (!user) return

    const isBanned = user.chatBannedUntil
      ? user.chatBannedUntil > new Date()
      : user.chatBannedAt !== null

    if (isBanned) {
      return reply.code(403).send(createApiError(ErrorCodes.FORBIDDEN, "Вам запрещено писать в чат"))
    }
  }

  // POST /api/discussions/:id/messages — создать сообщение
  fastify.post<{ Params: { id: string }; Body: CreateMessageBody }>(
    "/:id/messages",
    { preHandler: [authMiddleware, checkChatBan] },
    async (request, reply) => {
      const userId = request.user!.userId
      const { content, parentId } = request.body
      const message = await service.createMessage(request.params.id, userId, content, parentId)
      return reply.code(201).send(createSuccessResponse(message))
    },
  )

  // PATCH /api/discussions/:id/messages/:messageId — редактировать своё сообщение
  fastify.patch<{ Params: { id: string; messageId: string }; Body: UpdateMessageBody }>(
    "/:id/messages/:messageId",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = request.user!.userId
      const { content } = request.body
      try {
        return reply.send(createSuccessResponse(await service.updateMessage(request.params.messageId, userId, content)))
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message === "Message not found") {
            return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, err.message))
          }
          if (err.message === "You can only edit your own messages") {
            return reply.code(403).send(createApiError(ErrorCodes.FORBIDDEN, err.message))
          }
        }
        throw err
      }
    },
  )

  // DELETE /api/discussions/:id/messages/:messageId — удалить (админ/модератор)
  fastify.delete<{ Params: { id: string; messageId: string } }>(
    "/:id/messages/:messageId",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = request.user!.userId
      const userRole = request.user!.role
      try {
        await service.deleteMessage(request.params.messageId, userId, userRole)
        return reply.code(204).send()
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message === "Message not found") {
            return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, err.message))
          }
          if (err.message === "Only admins and moderators can delete messages") {
            return reply.code(403).send(createApiError(ErrorCodes.FORBIDDEN, err.message))
          }
        }
        throw err
      }
    },
  )
}
