import type { FastifyInstance } from "fastify"
import { authMiddleware } from "../auth/auth.middleware.js"
import * as service from "./discussions.service.js"
import * as schema from "./discussions.schema.js"
import type { CreateMessageBody, UpdateMessageBody } from "./discussions.schema.js"
import { ErrorCodes, createApiError, createSuccessResponse, createPaginatedResponse } from "../../lib/api-response.js"

export async function discussionRoutes(fastify: FastifyInstance) {
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

  // POST /api/discussions/:id/messages — создать сообщение
  fastify.post<{ Params: { id: string }; Body: CreateMessageBody }>(
    "/:id/messages",
    { preHandler: [authMiddleware] },
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
      } catch (err: any) {
        if (err.message === "Message not found") {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, err.message))
        }
        if (err.message === "You can only edit your own messages") {
          return reply.code(403).send(createApiError(ErrorCodes.FORBIDDEN, err.message))
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
      } catch (err: any) {
        if (err.message === "Message not found") {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, err.message))
        }
        if (err.message === "Only admins and moderators can delete messages") {
          return reply.code(403).send(createApiError(ErrorCodes.FORBIDDEN, err.message))
        }
        throw err
      }
    },
  )
}
