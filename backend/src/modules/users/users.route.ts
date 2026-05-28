/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance } from "fastify";
import {
  getMe,
  updateAvatar,
  deleteAvatar,
  getUserById,
  getUserStats,
  updateUser,
  changePassword,
  getAllUsers,
  getTasteMatch,
  getUserPublicTierLists,
} from "./users.service.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { ErrorCodes, createApiError, createSuccessResponse, createPaginatedResponse } from "../../lib/api-response.js";
import { tierListRepository } from "../../repositories/index.js";

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/users/me
  fastify.get(
    "/me",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const user = await getMe(userId);
      return reply.code(200).send(createSuccessResponse(user));
    },
  );

  // PUT /api/users/me
  fastify.put<{
    Body: { username: string };
  }>(
    "/me",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["username"],
          properties: {
            username: { type: "string", minLength: 2, maxLength: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const user = await updateUser(userId, request.body.username);
      fastify.log.info(
        { userId, username: request.body.username },
        "Username updated",
      );
      return reply.code(200).send(createSuccessResponse(user));
    },
  );

  // GET /api/users/me/stats
  fastify.get(
    "/me/stats",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const stats = await getUserStats(userId);
      return reply.code(200).send(createSuccessResponse(stats));
    },
  );

  // GET /api/users/:id/tier-lists — публичные тир-листы пользователя
  fastify.get<{
    Params: { id: string };
    Querystring: { page?: number; pageSize?: number };
  }>(
    "/:id/tier-lists",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = parseInt(request.params.id);
      const page = Number(request.query.page) || 1;
      const pageSize = Number(request.query.pageSize) || 10;
      const result = await getUserPublicTierLists(userId, page, pageSize);
      const totalPages = Math.ceil(result.totalItems / pageSize);
      return reply.send(
        createPaginatedResponse(result.data, {
          totalItems: result.totalItems,
          totalPages,
          currentPage: page,
          itemCount: result.data.length,
          itemsPerPage: pageSize,
        }, {
          self: `/api/users/${request.params.id}/tier-lists?page=${page}&pageSize=${pageSize}`,
          ...(page < totalPages ? { next: `/api/users/${request.params.id}/tier-lists?page=${page + 1}&pageSize=${pageSize}` } : {}),
          ...(page > 1 ? { prev: `/api/users/${request.params.id}/tier-lists?page=${page - 1}&pageSize=${pageSize}` } : {}),
          last: `/api/users/${request.params.id}/tier-lists?page=${totalPages}&pageSize=${pageSize}`,
        }),
      );
    },
  );

  // GET /api/users/:id/taste-match — совпадение вкусов
  fastify.get<{ Params: { id: string } }>(
    "/:id/taste-match",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const targetUserId = parseInt(request.params.id);
      const currentUserId = (request as any).user?.userId;
      const match = await getTasteMatch(targetUserId, currentUserId);
      return reply.send(createSuccessResponse(match));
    },
  );

  // GET /api/users/:id
  fastify.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = await getUserById(request.params);
      return reply.code(200).send(createSuccessResponse(user));
    },
  );

  // PUT /api/users/me/avatar
  fastify.put<{
    Body: { avatarUrl: string };
  }>(
    "/me/avatar",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["avatarUrl"],
          properties: {
            avatarUrl: { type: "string", maxLength: 2048 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const user = await updateAvatar(userId, request.body.avatarUrl);
      fastify.log.info(
        { userId, avatar: request.body.avatarUrl },
        "Avatar updated",
      );
      return reply.code(200).send(createSuccessResponse(user));
    },
  );

  // DELETE /api/users/me/avatar
  fastify.delete(
    "/me/avatar",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const user = await deleteAvatar(userId);
      fastify.log.info({ userId }, "Avatar deleted");
      return reply.code(200).send(createSuccessResponse(user));
    },
  );

  // PUT /api/users/me/password
  fastify.put<{
    Body: { current_password: string; new_password: string };
  }>(
    "/me/password",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["current_password", "new_password"],
          properties: {
            current_password: { type: "string", minLength: 1, maxLength: 100 },
            new_password: { type: "string", minLength: 8, maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const user = await changePassword(
        userId,
        request.body.current_password,
        request.body.new_password,
      );
      fastify.log.info({ userId }, "Password changed");
      return reply.code(200).send(createSuccessResponse(user));
    },
  );

  // GET /api/users/admin/all - получить всех пользователей (только админ)
  fastify.get(
    "/admin/all",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const users = await getAllUsers();
      return reply.code(200).send(createSuccessResponse(users));
    },
  );
}
