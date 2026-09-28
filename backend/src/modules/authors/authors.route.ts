// backend/src/modules/authors/authors.route.ts
import type { FastifyInstance } from 'fastify';
import { createAuthorService } from './authors.service.js';
import { createApiError, createSuccessResponse, ErrorCodes } from '../../lib/api-response.js';

export async function authorsRoutes(fastify: FastifyInstance) {
  const authorService = createAuthorService(fastify.prisma);

  // GET /api/authors/search?q=<query>&limit=<limit>
  fastify.get<{
    Querystring: { q: string; limit?: number };
  }>('/search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1, description: 'Поисковый запрос (имя автора)' },
          limit: { type: 'number', minimum: 1, maximum: 50, default: 10, description: 'Максимум результатов' },
        },
      },
    },
  }, async (request, reply) => {
    const { q, limit = 10 } = request.query;
    const authors = await authorService.search(q, limit);
    return reply.code(200).send(createSuccessResponse({ authors }));
  });

  // GET /api/authors/:slug — данные страницы автора (SEO-лендинг)
  fastify.get<{ Params: { slug: string } }>('/:slug', {
    schema: {
      params: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: { type: 'string', minLength: 1, maxLength: 200 },
        },
      },
    },
  }, async (request, reply) => {
    const data = await authorService.getBySlug(request.params.slug);
    if (!data) {
      return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, 'Автор не найден'));
    }
    return reply.code(200).send(createSuccessResponse(data));
  });
}
