import type { FastifyInstance } from 'fastify';
import { generateAvatar, getAvatarLimit } from './avatar.service.js';
import { updateAvatar as updateUserAvatar } from '../users/users.service.js';
import { authMiddleware } from '../auth/auth.middleware.js';

interface GenerateAvatarBody {
  prompt: string;
}

interface UploadAvatarBody {
  avatar: string;
}

export async function avatarRoutes(fastify: FastifyInstance) {
  // Генерация аватара
  fastify.post<{ Body: GenerateAvatarBody }>(
    '/generate',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { prompt } = request.body;

      if (!prompt || prompt.trim().length < 2) {
        return reply.code(400).send({ error: 'Prompt must be at least 2 characters' });
      }

      const userId = request.user.userId;

      const result = await generateAvatar(prompt.trim(), userId);

      if (!result.success) {
        return reply.code(429).send({
          error: result.error,
          remaining: result.remaining,
        });
      }

      return reply.send({
        success: true,
        imageUrl: result.imageUrl,
        remaining: result.remaining,
      });
    }
  );

  // Загрузка аватара
  fastify.post<{ Body: UploadAvatarBody }>(
    '/upload',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { avatar } = request.body;

      if (!avatar) {
        return reply.code(400).send({ error: 'Avatar is required' });
      }

      const user = await updateUserAvatar(
      request.user.userId,
      avatar
    );

      return reply.send({
        success: true,
        avatarUrl: user.avatarUrl,
      });
    }
  );

  // Лимиты
  fastify.get(
    '/limit',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = request.user.userId;

      const limitInfo = await getAvatarLimit(userId);

      if (!limitInfo) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return reply.send(limitInfo);
    }
  );
}
