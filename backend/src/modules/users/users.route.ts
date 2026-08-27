/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance } from "fastify";
import {
  getMe,
  updateAvatar,
  deleteAvatar,
  getUserById,
  getUserStats,
  getActivityTimeline,
  updateUser,
  changePassword,
  getAllUsers,
  searchUsers,
  getTasteMatch,
  getUserPublicTierLists,
  getMyTierLists,
  getMyBooks,
  getViolators,
  setDonorStatus,
  heartbeat,
  getUserBadges,
  addUserBadge,
  updateUserBadge,
  deleteUserBadge,
} from "./users.service.js";

import type { SocialLink, BadgeColor } from "./users.service.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { ErrorCodes, createApiError, createSuccessResponse, createPaginatedResponse } from "../../lib/api-response.js";

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
    Body: { username: string; bio?: string | null; socialLinks?: SocialLink[] | null };
  }>(
    "/me",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["username"],
          properties: {
            username: { type: "string", minLength: 2 },
            bio: { type: "string", maxLength: 500, nullable: true },
            socialLinks: {
              type: "array",
              maxItems: 6,
              items: {
                type: "object",
                required: ["platform", "url"],
                properties: {
                  platform: { type: "string", minLength: 1, maxLength: 20 },
                  url: { type: "string", maxLength: 500 },
                },
              },
              nullable: true,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const user = await updateUser(userId, request.body);
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

  // GET /api/users/me/activity-timeline — активность по месяцам для графика
  fastify.get(
    "/me/activity-timeline",
    {
      preHandler: [authMiddleware],
      schema: {
        querystring: {
          type: "object",
          properties: { months: { type: "integer", minimum: 1, maximum: 12 } },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const months = Number((request.query as any)?.months) || 6;
      const timeline = await getActivityTimeline(userId, months);
      return reply.code(200).send(createSuccessResponse(timeline));
    },
  );

  // GET /api/users/me/tier-lists — все тир-листы текущего пользователя (включая приватные)
  fastify.get<{
    Querystring: { page?: number; pageSize?: number };
  }>(
    "/me/tier-lists",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const page = Number(request.query.page) || 1;
      const pageSize = Number(request.query.pageSize) || 10;
      const result = await getMyTierLists(userId, page, pageSize);
      const totalPages = Math.ceil(result.totalItems / pageSize);
      return reply.send(
        createPaginatedResponse(result.data, {
          totalItems: result.totalItems,
          totalPages,
          currentPage: page,
          itemCount: result.data.length,
          itemsPerPage: pageSize,
        }, {
          self: `/api/users/me/tier-lists?page=${page}&pageSize=${pageSize}`,
          ...(page < totalPages ? { next: `/api/users/me/tier-lists?page=${page + 1}&pageSize=${pageSize}` } : {}),
          ...(page > 1 ? { prev: `/api/users/me/tier-lists?page=${page - 1}&pageSize=${pageSize}` } : {}),
          last: `/api/users/me/tier-lists?page=${totalPages}&pageSize=${pageSize}`,
        }),
      );
    },
  );

  // GET /api/users/me/books — все книги текущего пользователя
  fastify.get(
    "/me/books",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const books = await getMyBooks(userId);
      return reply.send(createSuccessResponse(books));
    },
  );

  // GET /api/users/:id/tier-lists — публичные тир-листы пользователя
  // (доступно без авторизации: профили открыты для просмотра всем)
  fastify.get<{
    Params: { id: string };
    Querystring: { page?: number; pageSize?: number };
  }>(
    "/:id/tier-lists",
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
  // Публичный: без авторизации текущий пользователь неизвестен → нулевое совпадение
  fastify.get<{ Params: { id: string } }>(
    "/:id/taste-match",
    async (request, reply) => {
      const targetUserId = parseInt(request.params.id);
      const currentUserId = (request as any).user?.userId ?? null;
      const match = await getTasteMatch(targetUserId, currentUserId);
      return reply.send(createSuccessResponse(match));
    },
  );

  // GET /api/users/search?q= — поиск пользователей по нику
  fastify.get<{
    Querystring: { q: string };
  }>(
    "/search",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const q = request.query.q || "";
      const results = await searchUsers(q);
      return reply.send(createSuccessResponse(results));
    },
  );

  // GET /api/users/:id — публичный профиль (открыт всем, без авторизации)
  fastify.get<{ Params: { id: string } }>(
    "/:id",
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

  // POST /api/users/heartbeat — пульс активности (раз в минуту)
  fastify.post(
    "/heartbeat",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      const result = await heartbeat(userId);
      return reply.send(createSuccessResponse(result));
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

  // GET /api/users/admin/violators - получить нарушителей (только админ)
  fastify.get(
    "/admin/violators",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const violators = await getViolators();
      return reply.code(200).send(createSuccessResponse(violators));
    },
  );

  // PATCH /api/users/admin/:id/donor - установить/снять статус мецената (только админ)
  fastify.patch<{
    Params: { id: string };
    Body: { isDonor: boolean };
  }>(
    "/admin/:id/donor",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const userId = parseInt(request.params.id);
      const result = await setDonorStatus(userId, request.body.isDonor);
      return reply.code(200).send(createSuccessResponse(result));
    },
  );

  // ===== Кастомные бейджи =====

  // GET /api/users/:id/badges — получить бейджи пользователя (публичный)
  fastify.get<{ Params: { id: string } }>(
    "/:id/badges",
    async (request, reply) => {
      const userId = parseInt(request.params.id);
      const badges = await getUserBadges(userId);
      return reply.code(200).send(createSuccessResponse(badges));
    },
  );

  // POST /api/users/:id/badges — добавить бейдж (только админ)
  fastify.post<{
    Params: { id: string };
    Body: { text: string; color: string };
  }>(
    "/:id/badges",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        body: {
          type: "object",
          required: ["text", "color"],
          properties: {
            text: { type: "string", minLength: 1, maxLength: 20 },
            color: { type: "string", enum: ["purple", "blue", "amber", "green", "red", "cyan"] },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = parseInt(request.params.id);
      const { text, color } = request.body;
      const badge = await addUserBadge(userId, text, color as BadgeColor);
      return reply.code(201).send(createSuccessResponse(badge));
    },
  );

  // PUT /api/users/badges/:badgeId — обновить бейдж (только админ)
  fastify.put<{
    Params: { badgeId: string };
    Body: { text: string; color: string };
  }>(
    "/badges/:badgeId",
    {
      preHandler: [authMiddleware, requireRole("admin")],
      schema: {
        body: {
          type: "object",
          required: ["text", "color"],
          properties: {
            text: { type: "string", minLength: 1, maxLength: 20 },
            color: { type: "string", enum: ["purple", "blue", "amber", "green", "red", "cyan"] },
          },
        },
      },
    },
    async (request, reply) => {
      const badgeId = parseInt(request.params.badgeId);
      const { text, color } = request.body;
      const badge = await updateUserBadge(badgeId, text, color as BadgeColor);
      return reply.code(200).send(createSuccessResponse(badge));
    },
  );

  // DELETE /api/users/badges/:badgeId — удалить бейдж (только админ)
  fastify.delete<{ Params: { badgeId: string } }>(
    "/badges/:badgeId",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const badgeId = parseInt(request.params.badgeId);
      await deleteUserBadge(badgeId);
      return reply.code(200).send(createSuccessResponse({ success: true }));
    },
  );
}
