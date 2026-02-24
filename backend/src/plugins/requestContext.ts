/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/plugins/requestContext.ts
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';

interface RequestContext {
  requestId: string;
  userId?: number;
  method?: string;
  path?: string;
}

// Extend FastifyRequest to include context
declare module 'fastify' {
  interface FastifyRequest {
    context: RequestContext;
    elapsedTime?: number;
  }
}

const requestContext: FastifyPluginAsync = async (fastify) => {
  // Add requestId and context to every request
  fastify.addHook('onRequest', async (request) => {
    const requestId = randomUUID();
    const userId = (request as any).user?.userId;

    request.context = {
      requestId,
      userId,
      method: request.method,
      path: request.url,
    };
  });

  // Decorate logger to include context automatically
  fastify.addHook('onResponse', async (request, reply) => {
    if (!request.context) return;
    const { requestId, userId, method, path } = request.context;
    const elapsed = request.elapsedTime;
    const responseTimeStr = elapsed !== undefined 
      ? `${elapsed.toFixed(2)}ms` 
      : 'N/A';
    fastify.log.info({
      requestId,
      userId,
      method,
      path,
      statusCode:  reply.statusCode,
      responseTime: responseTimeStr,
    }, 'Request completed');
  });
};

export default fp(requestContext, {
  name: 'request-context',
});
