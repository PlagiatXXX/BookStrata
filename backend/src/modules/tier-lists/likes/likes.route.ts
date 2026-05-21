/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../auth/auth.middleware.js';
import { like, unlike, getLikesWithStatus } from './likes.service.js';
import { eventBus } from "../../../lib/event-emitter.js";

export async function tierListLikesRoutes(fastify: FastifyInstance) {
  // GET /api/tier-lists/:id/likes - получить количество лайков и статус
  fastify.get<{ Params: { id: string } }>(
    '/:id/likes',
    async (request, reply) => {
      const tierListId = request.params.id;
      const userId = (request as any).user?.userId;

      const likes = await getLikesWithStatus(tierListId, userId);
      const newAchievements: any[] = [];
      return reply.code(200).send({ ...likes, newAchievements });
    }
  );

  // POST /api/tier-lists/:id/like - поставить лайк
  fastify.post<{ Params: { id: string } }>(
    '/:id/like',
    {
      preHandler: [authMiddleware],
    },
    async (request: any, reply) => {
      const tierListId = request.params.id;
      const userId = request.user.userId;

      await like(tierListId, userId);

      // Получаем обновлённое количество лайков
      const likes = await getLikesWithStatus(tierListId, userId);

      const tierList = await fastify.prisma.tierList.findUnique({ where: { id: tierListId }, select: { userId: true } });
      let newAchievements: unknown[] = [];
      if (tierList) {
        newAchievements = await eventBus.emit("tier-list:liked", {
          userId: request.user.userId,
          tierListUserId: tierList.userId,
        });
      }
      fastify.log.info({ userId, tierListId }, 'Tier list liked');
      return reply.code(200).send({ ...likes, newAchievements });
    }
  );

  // DELETE /api/tier-lists/:id/like - убрать лайк
  fastify.delete<{ Params: { id: string } }>(
    '/:id/like',
    {
      preHandler: [authMiddleware],
    },
    async (request: any, reply) => {
      const tierListId = request.params.id;
      const userId = request.user.userId;

      await unlike(tierListId, userId);

      // Получаем обновлённое количество лайков
      const likes = await getLikesWithStatus(tierListId, userId);

      fastify.log.info({ userId, tierListId }, 'Tier list unliked');
      const newAchievements: any[] = [];
      return reply.code(200).send({ ...likes, newAchievements });
    }
  );
}
