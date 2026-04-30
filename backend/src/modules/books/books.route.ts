// backend/src/modules/books/books.route.ts
import type { FastifyInstance } from 'fastify';
import { searchBooks } from './books.service.js';
import { authMiddleware } from '../auth/auth.middleware.js';

export async function booksRoutes(fastify: FastifyInstance) {
  // GET /api/books/search?q=<query>
  fastify.get<{
    Querystring: { q: string; startIndex?: number };
  }>('/search',
    {
      preHandler: [authMiddleware],
      schema: {
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', minLength: 2, description: 'Поисковый запрос' },
            startIndex: { type: 'number', minimum: 0, default: 0, description: 'Начальный индекс для пагинации' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { q, startIndex = 0 } = request.query;
        fastify.log.info({ query: q, startIndex }, 'Searching books');
        
        const books = await searchBooks(q, startIndex);
        
        fastify.log.info({ count: books.length }, 'Books search completed');
        
        return reply.code(200).send({ books });
      } catch (error) {
        if (error instanceof Error) {
          // Не настроенный ключ — это наша проблема, серверная ошибка
          if (error.message.includes('Google Books API key')) {
            fastify.log.error(error, 'Google Books API key not configured');
            return reply.code(500).send({ error: 'Google Books API не настроен на сервере' });
          }
          // Прочие ошибки (сеть, парсинг и т.п.) — логируем как warn, отдаём 502 (Bad Gateway)
          fastify.log.warn(error, 'Books search failed (upstream issue)');
          return reply.code(502).send({
            error: 'Сервис поиска временно недоступен, попробуйте позже',
            books: [],
          });
        }
        throw error;
      }
    }
  );
}
