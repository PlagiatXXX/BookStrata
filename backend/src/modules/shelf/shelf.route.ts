import type { FastifyInstance, FastifyRequest } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { createSuccessResponse } from "../../lib/api-response.js";
import { setShelfStatusSchema, importShelfSchema, removeShelfBooksSchema } from "./shelf.schema.js";
import type { SetShelfStatusBody, ShelfImportBody, ShelfRemoveBooksBody } from "./shelf.schema.js";
import {
  getShelf,
  getShelfBooks,
  setShelfStatus,
  removeShelfStatus,
  removeShelfBooks,
  importShelf,
  resolveBookId,
} from "./shelf.service.js";

/**
 * «Полка» — статусы книг пользователя (read / want_to_read).
 * Все маршруты требуют авторизации.
 */
export async function shelfRoutes(fastify: FastifyInstance) {
  // GET /api/shelf — вся полка текущего пользователя
  fastify.get(
    "/",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as FastifyRequest).user!.userId;
      const shelf = await getShelf(userId);
      return reply.send(createSuccessResponse(shelf));
    },
  );

  // GET /api/shelf/books — полка с данными книг (для страницы «Полка»)
  fastify.get(
    "/books",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as FastifyRequest).user!.userId;
      const shelf = await getShelfBooks(userId);
      return reply.send(createSuccessResponse(shelf));
    },
  );

  // PUT /api/shelf/books/:bookId — установить/переключить статус
  // bookId — строка: число (id таблицы Book) или ключ книги коллекции
  // ("curated_..."). Для строкового ключа body.book содержит данные книги
  // для find-or-create.
  fastify.put<{ Body: SetShelfStatusBody; Params: { bookId: string } }>(
    "/books/:bookId",
    {
      preHandler: [authMiddleware],
      schema: setShelfStatusSchema,
    },
    async (request, reply) => {
      const userId = (request as FastifyRequest).user!.userId;
      const entry = await setShelfStatus(
        userId,
        request.params.bookId,
        request.body.status,
        request.body.book,
      );
      return reply.send(createSuccessResponse(entry));
    },
  );

  // DELETE /api/shelf/books/:bookKey — снять отметку
  // Ключ строкой: числовой — id таблицы Book; строковый создаётся только
  // у гостей до входа и на сервере не встречается (импорт создаёт числовые),
  // поэтому для него достаточно найти запись по титулу/автору — или
  // проигнорировать, если книга ещё не синхронизирована.
  fastify.delete<{ Params: { bookKey: string } }>(
    "/books/:bookKey",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as FastifyRequest).user!.userId;
      const bookId = resolveBookId(request.params.bookKey);
      if (bookId !== null) {
        await removeShelfStatus(userId, bookId);
      }
      return reply.code(204).send();
    },
  );

  // POST /api/shelf/remove — снять отметки с набора книг (секция/вся полка)
  fastify.post<{ Body: ShelfRemoveBooksBody }>(
    "/remove",
    {
      preHandler: [authMiddleware],
      schema: removeShelfBooksSchema,
    },
    async (request, reply) => {
      const userId = (request as FastifyRequest).user!.userId;
      const result = await removeShelfBooks(userId, request.body.bookKeys);
      return reply.send(createSuccessResponse(result));
    },
  );

  // POST /api/shelf/import — merge гостевой полки в аккаунт после входа
  fastify.post<{ Body: ShelfImportBody }>(
    "/import",
    {
      preHandler: [authMiddleware],
      schema: importShelfSchema,
    },
    async (request, reply) => {
      const userId = (request as FastifyRequest).user!.userId;
      const result = await importShelf(userId, request.body.items);
      return reply.send(createSuccessResponse(result));
    },
  );
}