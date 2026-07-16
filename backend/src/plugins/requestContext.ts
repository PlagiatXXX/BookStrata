import { AsyncLocalStorage } from 'async_hooks';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';

export interface RequestStore {
  requestId: string;
  userId?: number;
}

/**
 * Единый AsyncLocalStorage для контекста HTTP-запроса.
 * Позволяет получить requestId и userId из любого места (logger, mailer, eventBus)
 * без необходимости передавать их через параметры.
 */
export const requestContextAls = new AsyncLocalStorage<RequestStore>();

/**
 * Получить контекст текущего запроса (requestId, userId).
 * Вне HTTP-запроса (cron, тесты) возвращает undefined.
 */
export function getRequestContext(): RequestStore | undefined {
  return requestContextAls.getStore();
}

/**
 * Получить requestId текущего запроса.
 * Вне HTTP-запроса возвращает undefined.
 */
export function getRequestId(): string | undefined {
  return requestContextAls.getStore()?.requestId;
}

declare module 'fastify' {
  interface FastifyRequest {
    context: {
      requestId: string;
      userId?: number;
      method?: string;
      path?: string;
    };
    elapsedTime?: number;
  }
}

const requestContext: FastifyPluginAsync = async (fastify) => {
  // Создаём контекст для каждого запроса и запускаем AsyncLocalStorage
  fastify.addHook('onRequest', (request, reply, done) => {
    const requestId = randomUUID();
    const store: RequestStore = { requestId };

    // Запоминаем на request для совместимости и onResponse
    request.context = {
      ...store,
      method: request.method,
      path: request.url,
    };

    // ALS.run() гарантирует, что store доступен во всех асинхронных операциях,
    // инициированных после вызова done()
    requestContextAls.run(store, done);
  });

  // Логируем завершение запроса
  fastify.addHook('onResponse', async (request, reply) => {
    if (!request.context) return;
    const { requestId, method, path } = request.context;
    const userId = requestContextAls.getStore()?.userId;
    const elapsed = request.elapsedTime;
    const responseTimeStr = elapsed !== undefined
      ? `${elapsed.toFixed(2)}ms`
      : 'N/A';

    fastify.log.info({
      requestId,
      userId,
      method,
      path,
      statusCode: reply.statusCode,
      responseTime: responseTimeStr,
    }, 'Request completed');
  });
};

export default fp(requestContext, {
  name: 'request-context',
});
