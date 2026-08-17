// backend/src/modules/books/books.route.ts
import type { FastifyInstance } from "fastify";
import { searchBooks } from "./books.service.js";
import { getBookPageData } from "./bookPage.service.js";
import { toggleBookLike } from "./bookLike.service.js";
import {
  getBookComments,
  createBookComment,
  updateBookComment,
  deleteBookComment,
  toggleBookCommentLike,
  CommentNotFoundError,
  CommentForbiddenError,
  CannotLikeOwnCommentError,
} from "./bookComment.service.js";
import { addBooksToTierList } from "../tier-lists/tierList.books.service.js";
import { assertOwner } from "../tier-lists/tierList.utils.js";
import { prisma } from "../../lib/prisma.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import { ErrorCodes, createApiError, createSuccessResponse } from "../../lib/api-response.js";

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
        
        return reply.code(200).send(createSuccessResponse({ books }));
      } catch (error) {
        if (error instanceof Error) {
          // Не настроенный ключ — это наша проблема, серверная ошибка
          if (error.message.includes('Google Books API key')) {
            fastify.log.error(error, 'Google Books API key not configured');
            return reply.code(500).send(createApiError(ErrorCodes.EXTERNAL_SERVICE_ERROR, 'Google Books API не настроен на сервере'));
          }
          // Прочие ошибки (сеть, парсинг и т.п.) — логируем как warn, отдаём 502 (Bad Gateway)
          fastify.log.warn(error, 'Books search failed (upstream issue)');
          return reply.code(502).send(createApiError(ErrorCodes.SERVICE_UNAVAILABLE, 'Сервис поиска временно недоступен, попробуйте позже'));
        }
        throw error;
      }
    }
  );

  // GET /:slug — публичная страница книги (только published-книги; draft → 404)
  fastify.get(
    "/:slug",
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      // request.user ставится глобальным auth-плагином опционально (гость = undefined)
      const userId = (request as { user?: { userId?: number } }).user?.userId;
      const page = await getBookPageData(slug, userId);
      if (!page) {
        return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Книга не найдена"));
      }
      reply.header("Cache-Control", "public, max-age=60, s-maxage=300");
      return reply.send(createSuccessResponse(page));
    },
  );

  // POST /:slug/like — лайк/анлайк книги (требует auth)
  fastify.post<{ Params: { slug: string } }>(
    "/:slug/like",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { slug } = request.params;
      const userId = (request as { user?: { userId?: number } }).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      try {
        const result = await toggleBookLike(slug, userId);
        return reply.send(createSuccessResponse(result));
      } catch (error) {
        if (error instanceof Error && error.message === "book_not_found") {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Книга не найдена"));
        }
        throw error;
      }
    },
  );

  // POST /:slug/tier-lists — добавить книгу в тир-лист пользователя (требует auth)
  fastify.post<{ Params: { slug: string }; Body: { tierListId: string } }>(
    "/:slug/tier-lists",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { slug } = request.params;
      const { tierListId } = request.body;
      const userId = (request as { user?: { userId?: number } }).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      if (!tierListId) {
        return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "tierListId обязателен"));
      }

      try {
        // Книга должна существовать и быть published
        const book = await prisma.book.findUnique({
          where: { slug },
          select: {
            id: true,
            title: true,
            author: true,
            coverImageUrl: true,
            externalId: true,
            source: true,
            status: true,
          },
        });
        if (!book || book.status !== "published") {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Книга не найдена"));
        }

        // Проверка владельца тир-листа
        try {
          await assertOwner(tierListId, userId);
        } catch {
          return reply.code(403).send(createApiError(ErrorCodes.FORBIDDEN, "Можно добавлять только в свои тир-листы"));
        }

        // Решение 17.08: тир-листы не склеиваются с каталогом — со страницы
        // книги добавляется ПОЛЬЗОВАТЕЛЬСКАЯ копия (draft): каталоговые данные
        // (externalId/source) не наследуются, чтобы не конфликтовать с каталогом
        // и не линковать тир-лист на каталоговую книгу.
        const results = await addBooksToTierList(tierListId, [
          {
            title: book.title,
            author: book.author,
            coverImageUrl: book.coverImageUrl,
            description: null,
            thoughts: null,
            externalId: null,
            source: null,
          },
        ]);

        const placement = results[0];
        if (!placement) {
          throw new Error("Failed to add book to tier list");
        }

        return reply.code(201).send(createSuccessResponse({ placement }));
      } catch (error) {
        if (error instanceof Error && (error.message.includes("not found") || error.message.includes("book_not_found"))) {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Книга не найдена"));
        }
        throw error;
      }
    },
  );

  // GET /:slug/comments — список комментариев (пагинация, newest first). Публичный.
  fastify.get<{ Params: { slug: string }; Querystring: { offset?: string; limit?: string } }>(
    "/:slug/comments",
    async (request, reply) => {
      const { slug } = request.params;
      const offset = Number(request.query.offset ?? 0);
      const limit = Number(request.query.limit ?? 10);
      try {
        const result = await getBookComments(slug, offset, limit);
        reply.header("Cache-Control", "public, max-age=60, s-maxage=300");
        return reply.send(createSuccessResponse(result));
      } catch (error) {
        if (error instanceof Error && error.message === "book_not_found") {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Книга не найдена"));
        }
        throw error;
      }
    },
  );

  // POST /:slug/comments — создать комментарий (auth)
  fastify.post<{ Params: { slug: string }; Body: { content: string; parentId?: number } }>(
    "/:slug/comments",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { slug } = request.params;
      const { content, parentId } = request.body;
      const userId = (request as { user?: { userId?: number } }).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      try {
        const comment = await createBookComment(slug, userId, content, parentId);
        return reply.code(201).send(createSuccessResponse({ comment }));
      } catch (error) {
        if (error instanceof Error && error.message === "book_not_found") {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Книга не найдена"));
        }
        if (error instanceof Error && error.message === "parent_comment_not_found") {
          return reply.code(400).send(createApiError(ErrorCodes.INVALID_INPUT, "Комментарий-родитель не найден"));
        }
        if (error instanceof Error && error.message === "invalid_comment_content") {
          return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Комментарий должен быть от 1 до 2000 символов"));
        }
        throw error;
      }
    },
  );

  // PATCH /:slug/comments/:commentId — редактирование (свой или admin)
  fastify.patch<{ Params: { slug: string; commentId: string }; Body: { content: string } }>(
    "/:slug/comments/:commentId",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const commentId = Number(request.params.commentId);
      const { content } = request.body;
      const user = (request as { user?: { userId?: number; role?: string } }).user;
      if (!user?.userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      try {
        const comment = await updateBookComment(commentId, user.userId, user.role ?? "user", content);
        return reply.send(createSuccessResponse({ comment }));
      } catch (error) {
        if (error instanceof CommentNotFoundError) {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Комментарий не найден"));
        }
        if (error instanceof CommentForbiddenError) {
          return reply.code(403).send(createApiError(ErrorCodes.FORBIDDEN, "Недостаточно прав"));
        }
        if (error instanceof Error && error.message === "invalid_comment_content") {
          return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Комментарий должен быть от 1 до 2000 символов"));
        }
        throw error;
      }
    },
  );

  // DELETE /:slug/comments/:commentId — удаление (свой или admin/moderator)
  fastify.delete<{ Params: { slug: string; commentId: string } }>(
    "/:slug/comments/:commentId",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const commentId = Number(request.params.commentId);
      const user = (request as { user?: { userId?: number; role?: string } }).user;
      if (!user?.userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      try {
        const result = await deleteBookComment(commentId, user.userId, user.role ?? "user");
        return reply.send(createSuccessResponse(result));
      } catch (error) {
        if (error instanceof CommentNotFoundError) {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Комментарий не найден"));
        }
        if (error instanceof CommentForbiddenError) {
          return reply.code(403).send(createApiError(ErrorCodes.FORBIDDEN, "Недостаточно прав"));
        }
        throw error;
      }
    },
  );

  // POST /:slug/comments/:commentId/like — лайк/анлайк комментария (auth)
  fastify.post<{ Params: { slug: string; commentId: string } }>(
    "/:slug/comments/:commentId/like",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const commentId = Number(request.params.commentId);
      const userId = (request as { user?: { userId?: number } }).user?.userId;
      if (!userId) {
        return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, "Unauthorized"));
      }
      try {
        const result = await toggleBookCommentLike(commentId, userId);
        return reply.send(createSuccessResponse(result));
      } catch (error) {
        if (error instanceof CommentNotFoundError) {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Комментарий не найден"));
        }
        if (error instanceof CannotLikeOwnCommentError) {
          return reply.code(400).send(createApiError(ErrorCodes.INVALID_INPUT, "Нельзя лайкнуть свой комментарий"));
        }
        throw error;
      }
    },
  );
}
