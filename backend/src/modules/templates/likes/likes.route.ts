/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../auth/auth.middleware.js';
import { like, unlike, getLikesWithStatus } from './likes.service.js';

export async function templateLikesRoutes(fastify: FastifyInstance) {
  // GET /api/templates/:id/likes - получить количество лайков и статус
  fastify.get<{ Params: { id: string } }>(
    '/:id/likes',
    async (request, reply) => {
      const templateId = request.params.id;
      const userId = request.user?.userId;

      const likes = await getLikesWithStatus(templateId, userId);
      return reply.code(200).send({ data: likes });
    }
  );

  // POST /api/templates/:id/like - поставить лайк
  fastify.post<{ Params: { id: string } }>(
    '/:id/like',
    {
      preHandler: [authMiddleware],
    },
    async (request: any, reply) => {
      const templateId = request.params.id;
      const userId = request.user?.userId;

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      await like(templateId, userId);

      // Получаем обновлённое количество лайков
      const likes = await getLikesWithStatus(templateId, userId);

      fastify.log.info({ userId, templateId }, 'Template liked');
      return reply.code(200).send({ data: likes });
    }
  );

  // DELETE /api/templates/:id/like - убрать лайк
  fastify.delete<{ Params: { id: string } }>(
    '/:id/like',
    {
      preHandler: [authMiddleware],
    },
    async (request: any, reply) => {
      const templateId = request.params.id;
      const userId = request.user?.userId;

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const result = await unlike(templateId, userId);

      if (!result.success) {
        return reply.code(400).send({ error: result.message || 'Not liked' });
      }

      // Получаем обновлённое количество лайков
      const likes = await getLikesWithStatus(templateId, userId);

      fastify.log.info({ userId, templateId }, 'Template unliked');
      return reply.code(200).send({ data: likes });
    }
  );
}
