// backend/src/modules/admin-books/admin-books.route.ts
// Админка каталога книг (Фаза 7, seobook.md). Все роуты — только admin.
import type { FastifyPluginAsync } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { uploadBase64 } from "../../lib/upload.js";
import { validateImageSize } from "../../lib/validators.js";
import { createApiError, createSuccessResponse, ErrorCodes, type ErrorCode } from "../../lib/api-response.js";
import {
  AdminBookError,
  listBooks,
  getBookAdmin,
  updateBookAdmin,
  publishBookById,
  unpublishBookById,
  enrichBookFromGoogle,
  mergeBooksByIds,
  topBooksByViews,
  listBookComments,
  updateCommentAdmin,
  deleteCommentAdmin,
  type BookUpdateInput,
} from "./admin-books.service.js";

const handleError = (error: unknown, reply: {
  code: (code: number) => { send: (payload: unknown) => unknown };
}) => {
  if (error instanceof AdminBookError) {
    const map: Record<string, number> = {
      book_not_found: 404,
      invalid_slug: 400,
      slug_exists: 409,
      invalid_merge: 400,
      already_merged: 409,
      cannot_merge_published_into_draft: 409,
      google_empty: 404,
      invalid_comment_content: 400,
      book_from_tier_list: 409,
    };
    return reply.code(map[error.code] ?? 400).send(
      createApiError(error.code as ErrorCode, error.message),
    );
  }
  throw error;
};

export const adminBooksRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", requireRole("admin"));

  // GET /api/admin/books — листинг с фильтрами
  fastify.get<{
    Querystring: {
      q?: string;
      status?: string;
      genre?: string;
      duplicatesOnly?: string;
      origin?: string;
      sort?: string;
      offset?: string;
      limit?: string;
    };
  }>("/", async (request, reply) => {
    const origin = request.query.origin === "tier-list" || request.query.origin === "catalog"
      ? request.query.origin
      : undefined;
    const result = await listBooks({
      q: request.query.q,
      status: request.query.status,
      genre: request.query.genre,
      duplicatesOnly: request.query.duplicatesOnly === "true",
      origin,
      sort: request.query.sort,
      offset: Number(request.query.offset ?? 0),
      limit: Number(request.query.limit ?? 50),
    });
    return reply.send(createSuccessResponse(result));
  });

  // GET /api/admin/books/top-views — топ книг по просмотрам
  fastify.get<{ Querystring: { limit?: string } }>("/top-views", async (request, reply) => {
    const result = await topBooksByViews(Number(request.query.limit ?? 10));
    return reply.send(createSuccessResponse({ items: result }));
  });

  // GET /api/admin/books/comments — модерация комментариев
  fastify.get<{
    Querystring: { bookId?: string; q?: string; offset?: string; limit?: string };
  }>("/comments", async (request, reply) => {
    const result = await listBookComments({
      bookId: request.query.bookId ? Number(request.query.bookId) : undefined,
      q: request.query.q,
      offset: Number(request.query.offset ?? 0),
      limit: Number(request.query.limit ?? 50),
    });
    return reply.send(createSuccessResponse(result));
  });

  // PATCH /api/admin/books/comments/:id — редактирование (admin)
  fastify.patch<{ Params: { id: string }; Body: { content: string } }>(
    "/comments/:id",
    async (request, reply) => {
      try {
        const comment = await updateCommentAdmin(Number(request.params.id), request.body.content);
        return reply.send(createSuccessResponse(comment));
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // DELETE /api/admin/books/comments/:id — удаление (cascade на replies)
  fastify.delete<{ Params: { id: string } }>("/comments/:id", async (request, reply) => {
    try {
      await deleteCommentAdmin(Number(request.params.id));
      return reply.send(createSuccessResponse({ success: true }));
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // GET /api/admin/books/:id — полная книга
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const book = await getBookAdmin(Number(request.params.id));
    if (!book) {
      return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Книга не найдена"));
    }
    return reply.send(createSuccessResponse(book));
  });

  // PATCH /api/admin/books/:id — правка полей + slug (с историей)
  fastify.patch<{ Params: { id: string }; Body: BookUpdateInput }>(
    "/:id",
    async (request, reply) => {
      try {
        const book = await updateBookAdmin(Number(request.params.id), request.body);
        return reply.send(createSuccessResponse(book));
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // POST /upload-cover — загрузить обложку книги (base64 → S3/CDN)
  fastify.post<{ Body: { coverImageUrl: string } }>(
    "/upload-cover",
    async (request, reply) => {
      const { coverImageUrl } = request.body;

      if (!coverImageUrl || !coverImageUrl.startsWith("data:")) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_FORMAT, "Invalid image format"));
      }

      const sizeError = validateImageSize(coverImageUrl);
      if (sizeError) {
        return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, sizeError));
      }

      try {
        const uploadResult = await uploadBase64(
          coverImageUrl,
          "tiermaker-pro/book-covers",
        );
        return reply.code(200).send({ data: { coverImageUrl: uploadResult.url } });
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const err = error as { statusCode: number; message: string };
          return reply.code(err.statusCode).send(createApiError(ErrorCodes.INTERNAL_ERROR, err.message));
        }
        fastify.log.error({ error: String(error) }, "Failed to upload book cover");
        return reply.code(500).send(createApiError(ErrorCodes.UPLOAD_FAILED, "Failed to upload image"));
      }
    },
  );

  // POST /api/admin/books/:id/publish — через publishBook() (инвариант полноты)
  fastify.post<{ Params: { id: string } }>("/:id/publish", async (request, reply) => {
    try {
      const book = await publishBookById(Number(request.params.id));
      return reply.send(createSuccessResponse(book));
    } catch (error) {
      if (error instanceof Error && error.name === "IncompleteBookError") {
        return reply.code(422).send(
          createApiError(ErrorCodes.VALIDATION_ERROR, error.message),
        );
      }
      return handleError(error, reply);
    }
  });

  // POST /api/admin/books/:id/unpublish — возврат в draft
  fastify.post<{ Params: { id: string } }>("/:id/unpublish", async (request, reply) => {
    try {
      const book = await unpublishBookById(Number(request.params.id));
      return reply.send(createSuccessResponse(book));
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // POST /api/admin/books/:id/enrich — обогащение из Google Books
  fastify.post<{ Params: { id: string } }>("/:id/enrich", async (request, reply) => {
    try {
      const result = await enrichBookFromGoogle(Number(request.params.id));
      return reply.send(createSuccessResponse(result));
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // POST /api/admin/books/:id/merge — ручной merge { targetId } — канон
  fastify.post<{ Params: { id: string }; Body: { targetId: number } }>(
    "/:id/merge",
    async (request, reply) => {
      try {
        const canon = await mergeBooksByIds(Number(request.params.id), Number(request.body.targetId));
        return reply.send(createSuccessResponse(canon));
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );
};

export default adminBooksRoutes;
