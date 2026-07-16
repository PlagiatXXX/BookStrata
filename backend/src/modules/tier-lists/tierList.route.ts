/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/modules/tier-lists/tierList.route.ts
import type { FastifyInstance, FastifyRequest } from "fastify";
import { eventBus } from "../../lib/event-emitter.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import { createLogger } from "../../lib/logger.js";
import * as service from "./tierList.service.js";
import * as schema from "./tierList.schema.js";
import { uploadBase64, uploadFromUrl } from "../../lib/cloudinary.js";
import { validateImageSize } from "../../lib/validators.js";
import type {
  GetTierListsQuery,
  CreateTierListBody,
} from "./tierList.schema.js";
import {
  like,
  unlike,
  getLikesWithStatus,
} from "./likes/likes.service.js";
import { addBooksToTierList } from "./tierList.service.js";
import { ErrorCodes, createApiError, createSuccessResponse } from "../../lib/api-response.js";

// Логгер для роутов тир-листов
const logger = createLogger("TierListsRoutes", { color: "cyan" });

// Опциональный middleware - ничего не делает, так как request.user
// уже заполняется глобальным плагином authPlugin, если токен верный.
// Оставляем для совместимости с текущими определениями роутов.
async function optionalAuthMiddleware(_request: FastifyRequest) {
  void _request;
  // Ничего не делаем
}

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

export async function tierListRoutes(fastify: FastifyInstance) {
  // ========== ЛАЙКИ ==========

  // GET /api/tier-lists/:id/likes - получить количество лайков и статус
  fastify.get<{ Params: { id: string } }>(
    "/:id/likes",
    async (request, reply) => {
      const { requestId } = request.context;
      const userId = request.user?.userId;
      const tierListId = request.params.id;

      const likes = await getLikesWithStatus(tierListId, userId);
      fastify.log.info({ requestId, userId, tierListId }, "Likes fetched");
      return reply.code(200).send({ data: likes });
    },
  );

  // POST /api/tier-lists/:id/like - поставить лайк
  fastify.post<{ Params: { id: string } }>(
    "/:id/like",
    {
      preHandler: [authMiddleware],
      config: {
        rateLimit: {
          max: 100,
          timeWindow: "1 minute",
        },
      },
    },
    async (request: any, reply) => {
      const { requestId } = request.context;
      const userId = request.user?.userId;
      const tierListId = request.params.id;

      await like(tierListId, userId);

      const likes = await getLikesWithStatus(tierListId, userId);
      fastify.log.info({ requestId, userId, tierListId }, "Tier list liked");
      return reply.code(200).send({ data: likes });
    },
  );

  // DELETE /api/tier-lists/:id/like - убрать лайк
  fastify.delete<{ Params: { id: string } }>(
    "/:id/like",
    {
      preHandler: [authMiddleware],
      config: {
        rateLimit: {
          max: 100,
          timeWindow: "1 minute",
        },
      },
    },
    async (request: any, reply) => {
      const { requestId } = request.context;
      const userId = request.user?.userId;
      const tierListId = request.params.id;

      await unlike(tierListId, userId);

      const likes = await getLikesWithStatus(tierListId, userId);
      fastify.log.info({ requestId, userId, tierListId }, "Tier list unliked");
      return reply.code(200).send({ data: likes });
    },
  );

  // GET /api/tier-lists/liked - получить лайкнутые тир-листы пользователя с пагинацией
  fastify.get<{ Querystring: GetTierListsQuery }>(
    "/liked",
    {
      preHandler: [authMiddleware],
      ...schema.getTierListsSchema,
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const tierLists = await service.getLikedTierLists(userId, request.query);
      return reply.send(tierLists);
    },
  );

  // ========== ОСНОВНЫЕ РОУТЫ ==========

  /**
   * @openapi
   * /api/tier-lists/public:
   *   get:
   *     summary: Получить публичные тир-листы
   *     description: Возвращает список публичных тир-листов с пагинацией и сортировкой
   *     tags: [Tier Lists]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Номер страницы
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Размер страницы
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [updated_at, likes, created]
   *           default: updated_at
   *         description: Сортировка
   *     responses:
   *       200:
   *         description: Успешный ответ
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/definitions/TierListShort'
   *                 meta:
   *                   $ref: '#/definitions/PaginationMeta'
   */
  fastify.get<{ Querystring: GetTierListsQuery }>(
    "/public",
    {
      schema: schema.getPublicTierListsSchema,
    },
    async (request, reply) => {
      try {
        logger.debug("GET /public вызван", { query: request.query });
        const tierLists = await service.getPublicTierLists(request.query);
        logger.debug("Возвращаем публичные тир-листы", {
          dataLength: tierLists.data?.length,
          meta: tierLists.meta,
        });
        return reply.code(200).send({
          data: tierLists.data,
          meta: tierLists.meta,
          links: tierLists.links,
        });
      } catch (err) {
        logger.error(err as Error, { route: "GET /public" });
        throw err;
      }
    },
  );

  /**
   * @openapi
   * /api/tier-lists/:
   *   get:
   *     summary: Получить мои тир-листы
   *     description: Возвращает список тир-листов текущего пользователя с пагинацией
   *     tags: [Tier Lists]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Номер страницы
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Размер страницы
   *     responses:
   *       200:
   *         description: Успешный ответ
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/definitions/TierListShort'
   *                 meta:
   *                   $ref: '#/definitions/PaginationMeta'
   *       401:
   *         description: Не авторизован
   */
  // GET / -> Получить список с пагинацией
  fastify.get<{ Querystring: GetTierListsQuery }>(
    "/",
    { preHandler: [authMiddleware], ...schema.getTierListsSchema },
    async (request, reply) => {
      const userId = request.user!.userId;
      const tierLists = await service.getUserTierLists(userId, request.query);
      return reply.send(tierLists);
    },
  );

  /**
   * @openapi
   * /api/tier-lists/:
   *   post:
   *     summary: Создать новый тир-лист
   *     description: Создаёт новый пустой тир-лист с указанным названием
   *     tags: [Tier Lists]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 100
   *                 example: "Мои любимые книги 2024"
   *             required:
   *               - title
   *     responses:
   *       201:
   *         description: Тир-лист успешно создан
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/TierList'
   *       400:
   *         description: Ошибка валидации
   *       401:
   *         description: Не авторизован
   */
  // POST / -> Создать новый тир-лист
  fastify.post<{ Body: CreateTierListBody }>(
    "/",
    {
      preHandler: [authMiddleware],
      ...schema.createTierListSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const tierList = await service.createTierList(userId, request.body.title);
      const newAchievements = await eventBus.emit("tier-list:created", { userId });
      return reply.code(201).header("Location", `/api/tier-lists/${tierList.id}`).send({ data: { ...tierList, newAchievements } });
    },
  );

  // GET /:id -> Получить один тир-лист
  fastify.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [optionalAuthMiddleware], ...schema.getTierListByIdSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      let tierList: Awaited<ReturnType<typeof service.getFullTierList>>;
      try {
        tierList = await service.getFullTierList(tierListId);
      } catch {
        return reply.code(404).send(createApiError(ErrorCodes.TIER_LIST_NOT_FOUND, "Tier list not found"));
      }

      // 301 редирект UUID → slug (для SEO)
      if (service.isUuid(tierListId) && tierList.slug) {
        return reply.code(301).redirect(`/tier-lists/${tierList.slug}`);
      }

      const isOwner = request.user?.userId === tierList.userId;
      if (!tierList.isPublic && !isOwner) {
        return reply.code(403).send(createApiError(ErrorCodes.ACCESS_DENIED, "Access denied"));
      }
      return reply.send(createSuccessResponse(tierList));
    },
  );

  // GET /:id/taste-match — совпадение вкусов с автором тир-листа
  fastify.get<{ Params: { id: string } }>(
    "/:id/taste-match",
    async (request, reply) => {
      const tierListIdOrSlug = request.params.id;
      const currentUserId = (request as any).user?.userId;

      try {
        const result = await service.getTierListTasteMatch(
          tierListIdOrSlug,
          currentUserId,
        );
        return reply.code(200).send({ data: result });
      } catch (err: any) {
        if (err?.message?.includes("not found")) {
          return reply.code(404).send(
            createApiError(ErrorCodes.TIER_LIST_NOT_FOUND, "Tier list not found"),
          );
        }
        throw err;
      }
    },
  );

  // PUT /:id -> Обновить тир-лист (название или тему)
  fastify.put<{ Params: { id: string }; Body: { title?: string; theme?: string } }>(
    "/:id",
    { preHandler: [authMiddleware], ...schema.updateTierListSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      const tierList = await service.getFullTierList(tierListId);
      if (tierList.userId !== request.user!.userId) {
        return reply
          .code(403)
          .send(createApiError(ErrorCodes.FORBIDDEN, "You can only edit your own tier lists"));
      }

      const updateData: Record<string, string> = {};
      if (request.body.title) updateData.title = request.body.title.trim();
      if (request.body.theme) updateData.theme = request.body.theme;

      if (!Object.keys(updateData).length) {
        return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "No fields to update"));
      }

      const updatedTierList = await service.prisma.tierList.update({
        where: { id: tierList.id },
        data: updateData,
      });
      return reply.code(200).send({ data: updatedTierList });
    },
  );

  // DELETE
  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [authMiddleware], ...schema.deleteTierListSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      const tierList = await service.prisma.tierList.findUnique({
        where: service.getTierListWhereClause(tierListId),
        select: { id: true, userId: true },
      });
      if (!tierList) {
        return reply.code(404).send(createApiError(ErrorCodes.TIER_LIST_NOT_FOUND, "Tier list not found"));
      }
      if (tierList.userId !== request.user!.userId) {
        return reply
          .code(403)
          .send(createApiError(ErrorCodes.FORBIDDEN, "You can only delete your own tier lists"));
      }

      await service.deleteTierList(tierList.id);
      return reply
        .code(200)
        .send(createSuccessResponse({ message: "Tier list deleted successfully" }));
    },
  );

  // PUT /:id/placements -> Обновить позиции
  fastify.put<{
    Params: { id: string };
    Body: {
      placements: { bookId: number; tierId: number | null; rank: number }[];
    };
  }>(
    "/:id/placements",
    { preHandler: [authMiddleware], ...schema.updatePlacementsSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      await service.assertOwner(tierListId, request.user!.userId);
      await service.updatePlacements(tierListId, request.body.placements);
      const newAchievements = await eventBus.emit("tier-list:book-added", {
        userId: request.user!.userId,
      });
      return reply
        .code(200)
        .send({ data: { message: "Placements updated", newAchievements } });
    },
  );

  // PUT /:id/tiers -> Сохранить тиры (diff)
  fastify.put<{
    Params: { id: string };
    Body: {
      added?: Array<{ title: string; color: string; rank: number }>;
      updated?: Array<{
        id: number;
        title: string;
        color: string;
        rank: number;
      }>;
      deletedIds?: number[];
    };
  }>("/:id/tiers", { preHandler: [authMiddleware] }, async (request, reply) => {
    const tierListId = request.params.id;
    await service.assertOwner(tierListId, request.user!.userId);
    const savedTiers = await service.saveTiers(tierListId, request.body);
    return reply.code(200).send({ data: savedTiers });
  });

  // POST /:id/books -> Добавить книги
  fastify.post<{
    Params: { id: string };
    Body: {
      books: {
        title: string;
        author?: string | null;
        coverImageUrl: string;
        description?: string | null;
        thoughts?: string | null;
        genre?: string | null;
        tags?: string[];
      }[];
    };
  }>(
    "/:id/books",
    { preHandler: [authMiddleware], ...schema.addBooksSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      await service.assertOwner(tierListId, request.user!.userId);

      // === ОБРАБОТКА КАРТИНОК ПЕРЕД СОХРАНЕНИЕМ ===
      const processedBooks = await runWithConcurrency(
        request.body.books,
        async (book) => {
          const url = book.coverImageUrl;
          if (!url) return book;

          // data: → uploadBase64
          if (url.startsWith("data:")) {
            const sizeError = validateImageSize(url);
            if (sizeError) {
              fastify.log.warn({ book: book.title }, sizeError);
              return { ...book, coverImageUrl: "" };
            }
            try {
              const uploadResult = await uploadBase64(url, "tiermaker-pro/book-covers");
              return { ...book, coverImageUrl: uploadResult.url };
            } catch (error) {
              fastify.log.error({ error: String(error) }, "Failed to upload base64 image");
              return { ...book, coverImageUrl: "" };
            }
          }

          // Внешний URL → uploadFromUrl (скачать и загрузить в Cloudinary)
          if (url.startsWith("http") && !url.includes("cloudinary.com")) {
            try {
              const uploadResult = await uploadFromUrl(url, "tiermaker-pro/book-covers");
              return { ...book, coverImageUrl: uploadResult.url };
            } catch (error) {
              fastify.log.error({ error: String(error) }, "Failed to upload external cover");
              return book;
            }
          }

          return book;
        },
        3,
      );

      // Передаем обработанные данные в сервис
      const results = await service.addBooksToTierList(
        tierListId,
        processedBooks,
      );
      const newAchievements = await eventBus.emit("tier-list:book-added", {
        userId: request.user!.userId,
      });
      return reply.code(201).send({ data: { results, newAchievements } });
    },
  );

  // PUT /:id/books/:bookId -> Обновить книгу
  fastify.put<{
    Params: { id: string; bookId: string };
    Body: {
      title?: string;
      author?: string | null;
      description?: string | null;
      thoughts?: string | null;
      genre?: string | null;
      tags?: string[];
      coverImageUrl?: string;
    };
  }>(
    "/:id/books/:bookId",
    { preHandler: [authMiddleware], ...schema.updateBookSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      const bookId = parseInt(request.params.bookId, 10);

      if (Number.isNaN(bookId)) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_ID, "Invalid bookId"));
      }

      await service.assertOwner(tierListId, request.user!.userId);
      const updatedBook = await service.updateBook(
        tierListId,
        bookId,
        request.body,
      );
      let newAchievements: unknown[] = [];
      if (request.body.thoughts) {
        newAchievements = await eventBus.emit("review:written", {
          userId: request.user!.userId,
        });
      }
      return reply.code(200).send({ data: { ...updatedBook, newAchievements } });
    },
  );

  // DELETE /:id/books/:bookId -> Удалить книгу из листа
  fastify.delete<{ Params: { id: string; bookId: string } }>(
    "/:id/books/:bookId",
    { preHandler: [authMiddleware], ...schema.deleteBookSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      const bookId = parseInt(request.params.bookId, 10);

      if (Number.isNaN(bookId)) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_ID, "Invalid bookId"));
      }

      await service.assertOwner(tierListId, request.user!.userId);
      await service.removeBookFromTierList(tierListId, bookId);
      return reply.code(200).send({ data: { message: "Book removed" } });
    },
  );

  // PUT /:id/books/:bookId/cover -> Обновить обложку книги
  fastify.put<{
    Params: { id: string; bookId: string };
    Body: { coverImageUrl: string };
  }>(
    "/:id/books/:bookId/cover",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const tierListId = request.params.id;
      const bookId = parseInt(request.params.bookId, 10);
      const { coverImageUrl } = request.body;

      if (Number.isNaN(bookId)) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_ID, "Invalid bookId"));
      }

      await service.assertOwner(tierListId, request.user!.userId);

      // Проверяем, что это data URL
      if (!coverImageUrl || !coverImageUrl.startsWith("data:")) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_FORMAT, "Invalid image format"));
      }

      // Проверяем размер изображения
      const sizeError = validateImageSize(coverImageUrl);
      if (sizeError) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_INPUT, sizeError));
      }

      try {
        // Загружаем изображение на Cloudinary
        const uploadResult = await uploadBase64(
          coverImageUrl,
          "tiermaker-pro/book-covers",
        );

        // Обновляем обложку в базе данных
        await service.updateBookCover(tierListId, bookId, uploadResult.url);

        fastify.log.info(
          { bookId, coverUrl: uploadResult.url },
          "Book cover updated",
        );
        return reply.code(200).send({ data: { coverImageUrl: uploadResult.url } });
      } catch (error: any) {
        if (error?.statusCode) {
          return reply.code(error.statusCode).send(createApiError(ErrorCodes.INTERNAL_ERROR, error.message));
        }

        fastify.log.error(
          { error: String(error) },
          "Failed to upload cover image",
        );
        return reply.code(500).send(createApiError(ErrorCodes.UPLOAD_FAILED, "Failed to upload image"));
      }
    },
  );

  // PUT /:id/cover -> Обновить обложку тир-листа
  fastify.put<{
    Params: { id: string };
    Body: { coverImageUrl: string };
  }>(
    "/:id/cover",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const tierListId = request.params.id;
      const { coverImageUrl } = request.body;

      await service.assertOwner(tierListId, request.user!.userId);

      if (!coverImageUrl || !coverImageUrl.startsWith("data:")) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_FORMAT, "Invalid image format"));
      }

      // Проверяем размер изображения
      const sizeError = validateImageSize(coverImageUrl);
      if (sizeError) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_INPUT, sizeError));
      }

      try {
        const uploadResult = await uploadBase64(
          coverImageUrl,
          "tiermaker-pro/tier-list-covers",
        );

        await service.updateTierListCover(tierListId, uploadResult.url);

        return reply.code(200).send({ data: { coverImageUrl: uploadResult.url } });
      } catch (error: any) {
        if (error?.statusCode) {
          return reply.code(error.statusCode).send(createApiError(ErrorCodes.INTERNAL_ERROR, error.message));
        }
        fastify.log.error({ error: String(error) }, "Failed to upload tier list cover");
        return reply.code(500).send(createApiError(ErrorCodes.UPLOAD_FAILED, "Failed to upload image"));
      }
    },
  );

  // POST /:id/books/search -> Добавить книгу по данным из внешнего источника
  fastify.post<{
    Params: { id: string };
    Body: { title: string; author?: string | null; coverUrl: string };
  }>(
    "/:id/books/search",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const tierListId = request.params.id;
      const { requestId, userId } = request.context;
      const { title, author, coverUrl } = request.body;

      // Проверяем права
      const tierList = await service.getFullTierList(tierListId);
      const currentUserId = (request as any).user?.userId;
      if (!currentUserId || tierList.userId !== currentUserId) {
        return reply.code(403).send({ message: "Forbidden" });
      }

      // Проверяем наличие обложки
      if (!coverUrl) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_INPUT, "Book has no cover image"));
      }

      try {
        // Загружаем обложку на Cloudinary
        const uploadResult = await uploadFromUrl(
          coverUrl,
          "tiermaker-pro/book-covers",
        );

        // Используем единую функцию для добавления книги в тир-лист
        const results = await addBooksToTierList(tierListId, [
          {
            title,
            author: author || null,
            coverImageUrl: uploadResult.url,
            description: null,
            thoughts: null,
          },
        ]);
        const newAchievements = await eventBus.emit("tier-list:book-added", {
          userId: currentUserId,
        });

        const createdBook = results[0]?.book;
        if (!createdBook) {
          throw new Error("Failed to create book"); // будет поймано как 500
        }

        fastify.log.info(
          {
            requestId,
            userId,
            bookId: createdBook.id,
            tierListId,
            coverUrl: uploadResult.url,
          },
          "Book added from Open Library",
        );
        return reply.code(201).send({ data: { book: createdBook, newAchievements } });
      } catch (error) {
        fastify.log.error(
          { requestId, userId, error: String(error) },
          "Failed to add book from Open Library",
        );
        return reply.code(500).send(createApiError(ErrorCodes.INTERNAL_ERROR, "Failed to add book"));
      }
    },
  );

  // PUT /:id/public -> Переключить статус публичности
  fastify.put<{ Params: { id: string }; Body: { isPublic: boolean } }>(
    "/:id/public",
    { preHandler: [authMiddleware], ...schema.togglePublicSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      await service.assertOwner(tierListId, request.user!.userId);

      const updatedTierList = await service.togglePublic(
        tierListId,
        request.body.isPublic,
      );
      return reply.code(200).send({ data: updatedTierList });
    },
  );

  // POST /:id/fork -> Создать копию тир-листа
  fastify.post<{ Params: { id: string } }>(
    "/:id/fork",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const tierListId = request.params.id;
      const userId = request.user!.userId;

      try {
        const newTierList = await service.forkTierList(tierListId, userId);
        const newAchievements = await eventBus.emit("tier-list:forked", { userId });
        return reply.code(201).send({ data: { ...newTierList, newAchievements } });
      } catch (error: any) {
        const statusCode = error?.statusCode ?? 500;
        fastify.log.error(error);
        return reply.code(statusCode).send(createApiError(ErrorCodes.INTERNAL_ERROR, error?.message ?? "Failed to fork tier list"));
      }
    },
  );

  // PUT /:id/save-all -> Атомарное сохранение всего (тиры, книги, позиции)
  fastify.put<{
    Params: { id: string };
    Body: any;
  }>(
    "/:id/save-all",
    { preHandler: [authMiddleware], schema: schema.saveAllSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      await service.assertOwner(tierListId, request.user!.userId);

      const body = request.body as any;
      // Процессим картинки для новых книг, если они в base64
      if (body.newBooks?.length) {
        body.newBooks = await runWithConcurrency(
          body.newBooks,
          async (book: any) => {
            if (book.coverImageUrl && book.coverImageUrl.startsWith("data:")) {
              const sizeError = validateImageSize(book.coverImageUrl);
              if (sizeError) {
                fastify.log.warn({ book: book.title }, sizeError);
                return { ...book, coverImageUrl: "" };
              }
              try {
                const uploadResult = await uploadBase64(
                  book.coverImageUrl,
                  "tiermaker-pro/book-covers",
                );
                return { ...book, coverImageUrl: uploadResult.url };
              } catch {
                return { ...book, coverImageUrl: "" };
              }
            }
            return book;
          },
          3,
        );
      }

      const result = await service.saveAll(
        tierListId,
        request.user!.userId,
        body,
      );

      const newAchievements: unknown[] = [];
      if (body.newBooks?.length) {
        const achs = await eventBus.emit("tier-list:book-added", {
          userId: request.user!.userId,
        });
        newAchievements.push(...achs);
      }
      if (body.placements?.some((p: any) => p.thoughts)) {
        const achs = await eventBus.emit("review:written", {
          userId: request.user!.userId,
        });
        newAchievements.push(...achs);
      }

      return reply.code(200).send({ data: {
        message: "Saved successfully",
        newAchievements,
        ...result,
      } });
    },
  );
}
