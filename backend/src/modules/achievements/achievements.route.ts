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
         select: { xp: true }
       });

       if (!user) return reply.code(404).send({ message: "User not found" });

       const title = service.getTitleByXP(user.xp);
       return reply.code(200).send({ xp: user.xp, title });
    }
  );
}
