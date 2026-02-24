/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { validateToken } from './auth.service.js';

// Тип для user в запросе
declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: number;
      username: string;
    };
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const userPayload = validateToken(token);
  
  // Устанавливаем user в запрос
  (request as any).user = userPayload;
}