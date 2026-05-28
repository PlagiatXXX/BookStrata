import type { FastifyInstance } from "fastify";
import { ModerationService } from "./moderation.service.js";
import { requireRole } from "../../middleware/requireRole.js";
import { createSuccessResponse, createApiError, ErrorCodes } from "../../lib/api-response.js";
import { banChatSchema, suspendSchema, warnSchema, changeRoleSchema, createFlagSchema, resolveFlagSchema } from "./moderation.schema.js";
import { createFlag, getFlags, resolveFlag } from "./flags.service.js";

type IdParams = { Params: { id: string } };

export async function moderationRoutes(fastify: FastifyInstance) {
  const moderationService = new ModerationService(fastify.prisma);

  fastify.get<IdParams>(
    "/users/:id/moderation",
    { preHandler: [requireRole("admin", "moderator")] },
    async (req, reply) => {
      const userId = Number(req.params.id);
      if (isNaN(userId)) return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Неверный ID"));
      return reply.send(createSuccessResponse(await moderationService.getUserStatus(userId)));
    },
  );

  fastify.post<IdParams>(
    "/users/:id/ban-chat",
    { preHandler: [requireRole("admin", "moderator")] },
    async (req, reply) => {
      const targetUserId = Number(req.params.id);
      if (isNaN(targetUserId)) return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Неверный ID"));
      const { duration, reason } = banChatSchema.body.parse(req.body);
      const result = await moderationService.banChat(targetUserId, req.user!.userId, duration);
      return reply.send(createSuccessResponse(result));
    },
  );

  fastify.post<IdParams>(
    "/users/:id/unban-chat",
    { preHandler: [requireRole("admin", "moderator")] },
    async (req, reply) => {
      const targetUserId = Number(req.params.id);
      if (isNaN(targetUserId)) return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Неверный ID"));
      const result = await moderationService.unbanChat(targetUserId, req.user!.userId);
      return reply.send(createSuccessResponse(result));
    },
  );

  fastify.post<IdParams>(
    "/users/:id/suspend",
    { preHandler: [requireRole("admin")] },
    async (req, reply) => {
      const targetUserId = Number(req.params.id);
      if (isNaN(targetUserId)) return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Неверный ID"));
      const { duration, reason } = suspendSchema.body.parse(req.body);
      const result = await moderationService.suspend(targetUserId, req.user!.userId, duration, reason);
      return reply.send(createSuccessResponse(result));
    },
  );

  fastify.post<IdParams>(
    "/users/:id/unsuspend",
    { preHandler: [requireRole("admin")] },
    async (req, reply) => {
      const targetUserId = Number(req.params.id);
      if (isNaN(targetUserId)) return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Неверный ID"));
      const result = await moderationService.unsuspend(targetUserId, req.user!.userId);
      return reply.send(createSuccessResponse(result));
    },
  );

  fastify.post<IdParams>(
    "/users/:id/warn",
    { preHandler: [requireRole("admin", "moderator")] },
    async (req, reply) => {
      const targetUserId = Number(req.params.id);
      if (isNaN(targetUserId)) return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Неверный ID"));
      const { message } = warnSchema.body.parse(req.body);
      const result = await moderationService.warn(targetUserId, req.user!.userId, message);
      return reply.send(createSuccessResponse(result));
    },
  );

  fastify.get<IdParams>(
    "/users/:id/warnings",
    { preHandler: [requireRole("admin", "moderator")] },
    async (req, reply) => {
      const userId = Number(req.params.id);
      if (isNaN(userId)) return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Неверный ID"));
      return reply.send(createSuccessResponse(await moderationService.getWarnings(userId)));
    },
  );

  fastify.put<IdParams>(
    "/users/:id/role",
    { preHandler: [requireRole("admin")] },
    async (req, reply) => {
      const targetUserId = Number(req.params.id);
      if (isNaN(targetUserId)) return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Неверный ID"));
      const { role } = changeRoleSchema.body.parse(req.body);
      const roleData = await fastify.prisma.role.findUnique({ where: { name: role } });
      if (!roleData) return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Роль не найдена"));
      const user = await fastify.prisma.user.update({
        where: { id: targetUserId },
        data: { roleId: roleData.id },
        select: { id: true, username: true, role: { select: { name: true } } },
      });
      return reply.send(createSuccessResponse(user));
    },
  );

  // ====== Флаги контента (NSFW) ======

  fastify.post(
    "/flags",
    async (req, reply) => {
      const { imageUrl, flagType, targetId, nsfwScore } = createFlagSchema.body.parse(req.body);
      const flag = await createFlag(fastify, {
        userId: req.user!.userId,
        imageUrl,
        flagType,
        targetId: targetId ?? null,
        nsfwScore: nsfwScore ?? null,
      });
      return reply.code(201).send(createSuccessResponse(flag));
    },
  );

  fastify.get<{ Querystring: { status?: string; page?: string; pageSize?: string } }>(
    "/flags",
    { preHandler: [requireRole("admin", "moderator")] },
    async (req, reply) => {
      const status = req.query.status;
      const page = Number(req.query.page) || 1;
      const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
      const result = await getFlags(fastify, status, page, pageSize);
      return reply.send(createSuccessResponse(result));
    },
  );

  fastify.patch<{ Params: { id: string }; Body: { action: "resolved" | "dismissed" } }>(
    "/flags/:id/resolve",
    { preHandler: [requireRole("admin", "moderator")] },
    async (req, reply) => {
      const flagId = Number(req.params.id);
      if (isNaN(flagId)) return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Неверный ID"));

      const { action } = resolveFlagSchema.body.parse(req.body);
      const flag = await resolveFlag(fastify, flagId, req.user!.userId, action);
      return reply.send(createSuccessResponse(flag));
    },
  );
}
