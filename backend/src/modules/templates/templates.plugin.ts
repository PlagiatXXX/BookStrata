import { type FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../auth/auth.middleware.js';
import { templatesController } from './templates.controller.js';

const templatesPlugin: FastifyPluginAsync<{ prisma: PrismaClient }> = async (fastify, options) => {
  // Добавляем хук аутентификации для всех роутов шаблонов
  fastify.addHook('preHandler', authMiddleware);
  await templatesController(fastify, options.prisma);
};

export default templatesPlugin;
