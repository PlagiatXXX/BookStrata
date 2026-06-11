import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import * as service from "./achievements.service.js";
import { ErrorCodes, createApiError, createSuccessResponse } from "../../lib/api-response.js";

export async function achievementRoutes(fastify: FastifyInstance) {
  // GET /api/achievements/me
  fastify.get(
    "/me",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = request.user!.userId;
      // Ретроактивная проверка при каждом заходе в список достижений
      // Это гарантирует, что старые заслуги будут учтены
      await service.syncUserAchievements(userId);

      const achievements = await service.getUserAchievements(userId);
      return reply.code(200).send(createSuccessResponse(achievements));
    }
  );

  // GET /api/achievements/status
  // Возвращает XP, текущее звание и иконку
  fastify.get(
    "/status",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
       const userId = request.user!.userId;
       const user = await fastify.prisma.user.findUnique({
         where: { id: userId },
         select: { xp: true, title: true }
       });

       if (!user) return reply.code(404).send(createApiError(ErrorCodes.USER_NOT_FOUND, "User not found"));

       const titleEntry = service.getTitleEntryByXP(user.xp);
       return reply.code(200).send(createSuccessResponse({
         xp: user.xp,
         title: user.title,
         icon: titleEntry.icon,
       }));
    }
  );

  // POST /api/achievements/seed (Только для админов в идеале, но тут для инициализации)
  fastify.post(
    "/seed",
    async (request, reply) => {
      await service.seedAchievements();
      return reply.code(200).send(createSuccessResponse({ message: "Achievements seeded" }));
    }
  );
}
