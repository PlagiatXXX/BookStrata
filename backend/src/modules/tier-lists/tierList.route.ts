import type { FastifyInstance } from 'fastify';
import * as service from './tierList.service.js';
import * as schema from './tierList.schema.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkProLimit } from '../auth/pro.middleware.js';
import { checkBookLimit } from '../../utils/limits.js';
import { addBooksToTierList } from "./tierList.service.js";
import { uploadBase64, uploadFromUrl } from "../../lib/cloudinary.js";
import * as achievementService from "../achievements/achievements.service.js";

export async function tierListRoutes(fastify: FastifyInstance) {
  // GET /api/tier-lists -> Список своих тир-листов
  fastify.get<{ Querystring: any }>(
    "/",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      return service.getUserTierLists(request.user!.userId, request.query);
    },
  );

  // GET /api/tier-lists/public -> Публичные тир-листы
  fastify.get<{ Querystring: any }>("/public", async (request, reply) => {
    return service.getPublicTierLists(request.query);
  });

  // GET /api/tier-lists/liked -> Лайкнутые тир-листы
  fastify.get(
    "/liked",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      return service.getLikedTierLists(request.user!.userId);
    },
  );

  // GET /api/tier-lists/:id -> Получить один тир-лист
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const currentUserId = (request as any).user?.userId;
    return service.getFullTierList(request.params.id, currentUserId);
  });

  // POST /api/tier-lists -> Создать новый тир-лист
  fastify.post<{ Body: { title: string } }>(
    "/",
    { preHandler: [authMiddleware], ...schema.createTierListSchema },
    async (request, reply) => {
      const tierList = await service.createTierList(
        request.user!.userId,
        request.body.title,
      );
      const newAchievements = await achievementService.processAction(request.user!.userId, "create_list");
      return reply.code(201).send({ ...tierList, newAchievements });
    },
  );

  // DELETE /api/tier-lists/:id -> Удалить тир-лист
  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      await service.assertOwner(request.params.id, request.user!.userId);
      await service.deleteTierList(request.params.id);
      return reply.code(200).send({ message: "Deleted" });
    },
  );

  // PUT /api/tier-lists/:id -> Обновить тир-лист
  fastify.put<{
    Params: { id: string };
    Body: { title?: string; isPublic?: boolean; year?: number };
  }>(
    "/:id",
    { preHandler: [authMiddleware], ...schema.updateTierListSchema },
    async (request, reply) => {
      await service.assertOwner(request.params.id, request.user!.userId);
      return service.updateTierList(request.params.id, request.body);
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
      const resolvedId = await service.assertOwner(tierListId, request.user!.userId);
      await service.updatePlacements(resolvedId, request.body.placements);
      const newAchievements = await achievementService.processAction(request.user!.userId, "add_book");
      return reply.code(200).send({ message: "Placements updated", newAchievements });
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
    const resolvedId = await service.assertOwner(tierListId, request.user!.userId);
    const savedTiers = await service.saveTiers(resolvedId, request.body);
    return reply.code(200).send(savedTiers);
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
      }[];
    };
  }>(
    "/:id/books",
    { preHandler: [authMiddleware, checkProLimit], ...schema.addBooksSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      const resolvedId = await service.assertOwner(tierListId, request.user!.userId);

      // Проверяем лимит книг
      const currentBooksCount = await service.getTierListBooksCount(resolvedId);
      const booksToAdd = request.body.books.length;
      const limitCheck = checkBookLimit(
        currentBooksCount,
        booksToAdd,
        request.proLimit,
      );

      if (!limitCheck.allowed) {
        return reply.code(403).send({
          error: "Превышен лимит книг в тир-листе",
          remaining: limitCheck.remaining,
          required: request.proLimit?.isPro ? "Pro" : "Free",
        });
      }

      // === ОБРАБОТКА КАРТИНОК ПЕРЕД СОХРАНЕНИЕМ ===
      const processedBooks = await Promise.all(
        request.body.books.map(async (book) => {
          if (book.coverImageUrl && book.coverImageUrl.startsWith("data:")) {
            try {
              const uploadResult = await uploadBase64(
                book.coverImageUrl,
                "tiermaker-pro/book-covers",
              );
              // Заменяем base64 на нормальный URL
              return { ...book, coverImageUrl: uploadResult.url };
            } catch (error) {
              fastify.log.error(
                { error: String(error) },
                "Failed to upload base64 image",
              );
              // Если не удалось загрузить — ставим пустую строку, чтобы не упасть
              return { ...book, coverImageUrl: "" };
            }
          }
          // Если это уже URL (или пусто) — оставляем как есть
          return book;
        }),
      );

      // Передаем обработанные данные в сервис
      const results = await service.addBooksToTierList(
        resolvedId,
        processedBooks,
      );
      const newAchievements = await achievementService.processAction(request.user!.userId, "add_book");
      return reply.code(201).send({ results, newAchievements });
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
    };
  }>(
    "/:id/books/:bookId",
    { preHandler: [authMiddleware], ...schema.updateBookSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      const bookId = parseInt(request.params.bookId, 10);

      if (Number.isNaN(bookId)) {
        return reply.code(400).send({ error: "Invalid bookId" });
      }

      const resolvedId = await service.assertOwner(tierListId, request.user!.userId);
      const updatedBook = await service.updateBook(
        resolvedId,
        bookId,
        request.body,
      );
      let newAchievements: Awaited<
        ReturnType<typeof achievementService.processAction>
      > = [];
      if (request.body.thoughts) {
        newAchievements = await achievementService.processAction(
          request.user!.userId,
          "write_review",
        );
      }
      return reply.code(200).send({ ...updatedBook, newAchievements });
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
        return reply.code(400).send({ error: "Invalid bookId" });
      }

      const resolvedId = await service.assertOwner(tierListId, request.user!.userId);
      await service.removeBookFromTierList(resolvedId, bookId);
      return reply.code(200).send({ message: "Book removed" });
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
        return reply.code(400).send({ error: "Invalid bookId" });
      }

      const resolvedId = await service.assertOwner(tierListId, request.user!.userId);

      // Проверяем, что это data URL
      if (!coverImageUrl || !coverImageUrl.startsWith("data:")) {
        return reply.code(400).send({ error: "Invalid image format" });
      }

      try {
        // Загружаем изображение на Cloudinary
        const uploadResult = await uploadBase64(
          coverImageUrl,
          "tiermaker-pro/book-covers",
        );

        // Обновляем обложку в базе данных
        await service.updateBookCover(resolvedId, bookId, uploadResult.url);

        fastify.log.info(
          { bookId, coverUrl: uploadResult.url },
          "Book cover updated",
        );
        return reply.code(200).send({ coverImageUrl: uploadResult.url });
      } catch (error) {
        fastify.log.error(
          { error: String(error) },
          "Failed to upload cover image",
        );
        return reply.code(500).send({ error: "Failed to upload image" });
      }
    },
  );

  // POST /:id/books/search -> Добавить книгу из Open Library
  fastify.post<{
    Params: { id: string };
    Body: {
      openLibraryKey: string;
      title: string;
      author?: string | null;
      coverUrl: string;
    };
  }>(
    "/:id/books/search",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const tierListId = request.params.id;
      const { requestId, userId } = request.context;
      const { title, author, coverUrl } = request.body;
      const currentUserId = (request as any).user?.userId;

      const resolvedId = await service.assertOwner(tierListId, currentUserId);

      // Проверяем наличие обложки
      if (!coverUrl) {
        return reply.code(400).send({ error: "Book has no cover image" });
      }

      try {
        // Загружаем обложку на Cloudinary
        const uploadResult = await uploadFromUrl(
          coverUrl,
          "tiermaker-pro/book-covers",
        );

        // Используем единую функцию для добавления книги в тир-лист
        const results = await addBooksToTierList(resolvedId, [
          {
            title,
            author: author || null,
            coverImageUrl: uploadResult.url,
            description: null,
            thoughts: null,
          },
        ]);
        const newAchievements = await achievementService.processAction(currentUserId, "add_book");

        const createdBook = results[0]?.book;
        if (!createdBook) {
          throw new Error("Failed to create book");
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
        return reply.code(201).send({ book: createdBook, newAchievements });
      } catch (error) {
        fastify.log.error(
          { requestId, userId, error: String(error) },
          "Failed to add book from Open Library",
        );
        return reply.code(500).send({ error: "Failed to add book" });
      }
    },
  );

  // PUT /:id/public -> Переключить статус публичности
  fastify.put<{ Params: { id: string }; Body: { isPublic: boolean } }>(
    "/:id/public",
    { preHandler: [authMiddleware], ...schema.togglePublicSchema },
    async (request, reply) => {
      const tierListId = request.params.id;
      const resolvedId = await service.assertOwner(tierListId, request.user!.userId);

      const updatedTierList = await service.togglePublic(
        resolvedId,
        request.body.isPublic,
      );
      return reply.code(200).send(updatedTierList);
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
        const newAchievements = await achievementService.processAction(userId, "fork");
        return reply.code(201).send({ ...newTierList, newAchievements });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: "Failed to fork tier list" });
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
      const resolvedId = await service.assertOwner(tierListId, request.user!.userId);

      const body = request.body as any;
      // Процессим картинки для новых книг, если они в base64
      if (body.newBooks?.length) {
        body.newBooks = await Promise.all(
          body.newBooks.map(async (book: any) => {
            if (book.coverImageUrl && book.coverImageUrl.startsWith("data:")) {
              try {
                const uploadResult = await uploadBase64(
                  book.coverImageUrl,
                  "tiermaker-pro/book-covers"
                );
                return { ...book, coverImageUrl: uploadResult.url };
              } catch {
                return { ...book, coverImageUrl: "" };
              }
            }
            return book;
          })
        );
      }

      const result = await service.saveAll(
        resolvedId,
        request.user!.userId,
        body
      );

      const newAchievements = [];
      if (body.newBooks?.length) {
        const achs = await achievementService.processAction(request.user!.userId, "add_book");
        newAchievements.push(...achs);
      }
      if (body.placements?.some((p: any) => p.thoughts)) {
        const achs = await achievementService.processAction(request.user!.userId, "write_review");
        newAchievements.push(...achs);
      }

      return reply.code(200).send({
        message: "Saved successfully", newAchievements,
        ...result,
      });
    }
  );
}
