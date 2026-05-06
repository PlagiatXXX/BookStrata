import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import * as service from "./achievements.service.js";

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
      return reply.code(200).send(achievements);
    }
  );

  // GET /api/achievements/status
  // Возвращает XP и текущее звание
  fastify.get(
    "/status",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
       const userId = request.user!.userId;
       const user = await fastify.prisma.user.findUnique({
         where: { id: userId },
         select: { xp: true, title: true }
       });

       if (!user) return reply.code(404).send({ message: "User not found" });

       return reply.code(200).send({ xp: user.xp, title: user.title });
    }
  );

  // POST /api/achievements/seed (Только для админов в идеале, но тут для инициализации)
  fastify.post(
    "/seed",
    async (request, reply) => {
      await service.seedAchievements();
      return reply.code(200).send({ message: "Achievements seeded" });
    }
  );
}
