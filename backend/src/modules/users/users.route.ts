import type { FastifyInstance } from 'fastify';
import {
  getMe,
  updateAvatar,
  deleteAvatar,
  getUserById,
  getUserStats,
  updateUser,
  changePassword,
} from './users.service.js';
import { authMiddleware } from '../auth/auth.middleware.js';

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/users/me
  fastify.get(
    '/me',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = await getMe(request.user.userId);
      return reply.code(200).send(user);
    }
  );

  // PUT /api/users/me
  fastify.put<{
    Body: { username: string };
  }>(
    '/me',
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: 'object',
          required: ['username'],
          properties: {
            username: { type: 'string', minLength: 2, maxLength: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await updateUser(
        request.user.userId,
        request.body.username
      );
      fastify.log.info(
        { userId: request.user.userId, username: request.body.username },
        'Username updated'
      );
      return reply.code(200).send(user);
    }
  );

  // GET /api/users/me/stats
  fastify.get(
    '/me/stats',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const stats = await getUserStats(request.user.userId);
      return reply.code(200).send(stats);
    }
  );

  // GET /api/users/:id
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    const user = await getUserById(request.params);
    return reply.code(200).send(user);
  });

  // PUT /api/users/me/avatar
  fastify.put<{
    Body: { avatarUrl: string };
  }>(
    '/me/avatar',
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: 'object',
          required: ['avatarUrl'],
          properties: {
            avatarUrl: { type: 'string', format: 'uri' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await updateAvatar(
      request.user.userId,
      request.body.avatarUrl ?? null
    );
      fastify.log.info(
        { userId: request.user.userId, avatar: request.body.avatarUrl },
        'Avatar updated'
      );
      return reply.code(200).send(user);
    }
  );

  // DELETE /api/users/me/avatar
  fastify.delete(
    '/me/avatar',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = await deleteAvatar(request.user.userId);
      fastify.log.info(
        { userId: request.user.userId },
        'Avatar deleted'
      );
      return reply.code(200).send(user);
    }
  );

  // PUT /api/users/me/password
  fastify.put<{
    Body: { current_password: string; new_password: string };
  }>(
    '/me/password',
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: 'object',
          required: ['current_password', 'new_password'],
          properties: {
            current_password: { type: 'string', minLength: 1 },
            new_password: { type: 'string', minLength: 4 },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await changePassword(
        request.user.userId,
        request.body.current_password,
        request.body.new_password);
      fastify.log.info(
        { userId: request.user.userId },
        'Password changed'
      );
      return reply.code(200).send(result);
    }
  );
}
