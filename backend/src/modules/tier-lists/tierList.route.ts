/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/modules/tier-lists/tierList.route.ts
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import { validateToken } from '../auth/auth.service.js';
import * as service from './tierList.service.js';
import * as schema from './tierList.schema.js';
import type { GetTierListsQuery, CreateTierListBody } from './tierList.schema.js';
import { like, unlike, getLikesWithStatus, getLikedTierListIds } from './likes/likes.service.js';
import { uploadBase64, uploadFromUrl } from '../../lib/cloudinary.js';
import { addBooksToTierList } from './tierList.service.js';
import { updateBookCover } from './tierList.service.js';

// Опциональный middleware - проверяет токен если есть, но не требует
async function optionalAuthMiddleware(request: FastifyRequest) {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const userPayload = validateToken(token);
      (request as any).user = userPayload;
    } catch { /* empty */ }
  }
}

export async function tierListRoutes(fastify: FastifyInstance) {
  // ========== ЛАЙКИ ==========

  // GET /api/tier-lists/:id/likes - получить количество лайков и статус
  fastify.get<{ Params: { id: string } }>(
    '/:id/likes',
    async (request, reply) => {
      const { requestId } = request.context;
      const userId = request.user?.userId;
      const tierListId = parseInt(request.params.id);

      const likes = await getLikesWithStatus(tierListId, userId);
      fastify.log.info({ requestId, userId, tierListId }, 'Likes fetched');
      return reply.code(200).send(likes);
    }
  );

  // POST /api/tier-lists/:id/like - поставить лайк
  fastify.post<{ Params: { id: string } }>(
    '/:id/like',
    {
      preHandler: [authMiddleware],
    },
    async (request: any, reply) => {
      const { requestId } = request.context;
      const userId = request.user?.userId;
      const tierListId = parseInt(request.params.id);

      const result = await like(tierListId, userId);

      if (!result.success) {
        return reply.code(400).send({ error: result.message });
      }

      const likes = await getLikesWithStatus(tierListId, userId);
      fastify.log.info({ requestId, userId, tierListId }, 'Tier list liked');
      return reply.code(200).send(likes);
    }
  );

  // DELETE /api/tier-lists/:id/like - убрать лайк
  fastify.delete<{ Params: { id: string } }>(
    '/:id/like',
    {
      preHandler: [authMiddleware],
    },
    async (request: any, reply) => {
      const { requestId } = request.context;
      const userId = request.user?.userId;
      const tierListId = parseInt(request.params.id);

      await unlike(tierListId, userId);

      const likes = await getLikesWithStatus(tierListId, userId);
      fastify.log.info({ requestId, userId, tierListId }, 'Tier list unliked');
      return reply.code(200).send(likes);
    }
  );

  // GET /api/tier-lists/liked - получить все лайкнутые тир-листы пользователя
  fastify.get(
    '/liked',
    {
      preHandler: [authMiddleware],
    },
    async (request: any, reply) => {
      const userId = request.user.userId;
      const likedIds = await getLikedTierListIds(userId);
      return reply.code(200).send({ likedIds });
    }
  );

  // ========== ОСНОВНЫЕ РОУТЫ ==========
  fastify.get<{ Querystring: GetTierListsQuery }>(
    '/public',
    {
    schema: schema.getPublicTierListsSchema,
  },
    async (request, reply) => {
      const tierLists = await service.getPublicTierLists(request.query);
      return reply.send(tierLists);
    }
  );


  // GET / -> Получить список с пагинацией
  fastify.get<{ Querystring: GetTierListsQuery }>(
    '/',
    { preHandler: [authMiddleware], ...schema.getTierListsSchema },
    async (request, reply) => {
      const userId = request.user!.userId;
      const tierLists = await service.getUserTierLists(userId, request.query);
      return reply.send(tierLists);
    }
  );

  // POST / -> Создать новый тир-лист
  fastify.post<{ Body: CreateTierListBody }>(
    '/',
    { preHandler: [authMiddleware], ...schema.createTierListSchema },
    async (request, reply) => {
      const userId = request.user!.userId;
      const tierList = await service.createTierList(userId, request.body.title);
      return reply.code(201).send(tierList);
    }
  );

  // GET /:id -> Получить один тир-лист
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [optionalAuthMiddleware], ...schema.getTierListByIdSchema },
    async (request, reply) => {
        const tierListId = parseInt(request.params.id, 10);
        const tierList = await service.getFullTierList(tierListId);

        const isOwner = request.user?.userId === tierList.userId;
        if (!tierList.isPublic && !isOwner) {
          return reply.code(403).send({ message: 'Access denied' });
        }
        return tierList;
    }
  );

  // PUT /:id -> Обновить тир-лист (например, название)
  fastify.put<{ Params: { id: string }; Body: CreateTierListBody }>(
    '/:id',
    { preHandler: [authMiddleware], ...schema.updateTierListSchema },
    async (request, reply) => {
      const tierListId = parseInt(request.params.id, 10);
      const tierList = await service.getFullTierList(tierListId);
      if (tierList.userId !== request.user!.userId) {
        return reply.code(403).send({ message: 'You can only edit your own tier lists' });
      }

      const updatedTierList = await service.prisma.tierList.update({
        where: { id: tierListId },
        data: { title: request.body.title.trim() },
      });
      return reply.code(200).send(updatedTierList);
    }
  );

  // DELETE
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authMiddleware], ...schema.deleteTierListSchema },
    async (request, reply) => {
      const tierListId = parseInt(request.params.id, 10);
      const tierList = await service.prisma.tierList.findUnique({
        where: { id: tierListId },
        select: { id: true, userId: true },
      });
      if (!tierList) {
        return reply.code(404).send({ message: 'Tier list not found' });
      }
      if (tierList.userId !== request.user!.userId) {
        return reply.code(403).send({ message: 'You can only delete your own tier lists' });
      }

      await service.deleteTierList(tierListId);
      return reply.code(200).send({ message: 'Tier list deleted successfully' });
    }
  );


  // PUT /:id/placements -> Обновить позиции
  fastify.put<{ Params: { id: string }; Body: { placements: { bookId: number; tierId: number | null; rank: number }[] } }>(
    '/:id/placements',
    { preHandler: [authMiddleware], ...schema.updatePlacementsSchema },
    async (request, reply) => {
      const tierListId = parseInt(request.params.id, 10);
      await service.assertOwner(tierListId, request.user!.userId);
      await service.updatePlacements(tierListId, request.body.placements);
      return reply.code(200).send({ message: 'Placements updated' });
    }
  );

  // PUT /:id/tiers -> Сохранить тиры (diff)
  fastify.put<{
    Params: { id: string };
    Body: {
      added?: Array<{ title: string; color: string; rank: number }>;
      updated?: Array<{ id: number; title: string; color: string; rank: number }>;
      deletedIds?: number[];
    };
  }>(
    '/:id/tiers',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const tierListId = parseInt(request.params.id, 10);
      await service.assertOwner(tierListId, request.user!.userId);
      const savedTiers = await service.saveTiers(tierListId, request.body);
      return reply.code(200).send(savedTiers);
    }
  );

  // POST /:id/books -> Добавить книги
    fastify.post<{ Params: { id: string }; Body: { books: { title: string; author?: string | null; coverImageUrl: string; description?: string | null; thoughts?: string | null }[] } }>(
    '/:id/books',
    { preHandler: [authMiddleware], ...schema.addBooksSchema },
    async (request, reply) => {
      const tierListId = parseInt(request.params.id, 10);
      await service.assertOwner(tierListId, request.user!.userId);

      // === ОБРАБОТКА КАРТИНОК ПЕРЕД СОХРАНЕНИЕМ ===
      const processedBooks = await Promise.all(request.body.books.map(async (book) => {
        if (book.coverImageUrl && book.coverImageUrl.startsWith('data:')) {
          try {
            const uploadResult = await uploadBase64(book.coverImageUrl, 'tiermaker-pro/book-covers');
            // Заменяем base64 на нормальный URL
            return { ...book, coverImageUrl: uploadResult.url }; 
          } catch (error) {
            fastify.log.error({ error: String(error) }, 'Failed to upload base64 image');
            // Если не удалось загрузить — ставим пустую строку, чтобы не упасть
            return { ...book, coverImageUrl: '' }; 
          }
        }
        // Если это уже URL (или пусто) — оставляем как есть
        return book;
      }));

      // Передаем обработанные данные в сервис
      const results = await service.addBooksToTierList(tierListId, processedBooks);
      return reply.code(201).send(results);
    }
  );

  // PUT /:id/books/:bookId -> Обновить книгу
  fastify.put<{ Params: { id: string; bookId: string }; Body: { title?: string; author?: string | null; description?: string | null; thoughts?: string | null } }>(
    '/:id/books/:bookId',
    { preHandler: [authMiddleware], ...schema.updateBookSchema },
    async (request, reply) => {
      const tierListId = parseInt(request.params.id, 10);
      const bookId = parseInt(request.params.bookId, 10);
      await service.assertOwner(tierListId, request.user!.userId);
      const updatedBook = await service.updateBook(bookId, request.body);
      return reply.code(200).send(updatedBook);
    }
  );

  // DELETE /:id/books/:bookId -> Удалить книгу из листа
  fastify.delete<{ Params: { id: string; bookId: string } }>(
    '/:id/books/:bookId',
    { preHandler: [authMiddleware], ...schema.deleteBookSchema },
    async (request, reply) => {
      const tierListId = parseInt(request.params.id, 10);
      const bookId = parseInt(request.params.bookId, 10);
      await service.assertOwner(tierListId, request.user!.userId);
      await service.removeBookFromTierList(tierListId, bookId);
      return reply.code(200).send({ message: 'Book removed' });
    }
  );

  // PUT /:id/books/:bookId/cover -> Обновить обложку книги
  fastify.put<{ Params: { id: string; bookId: string }; Body: { coverImageUrl: string } }>(
    '/:id/books/:bookId/cover',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const tierListId = parseInt(request.params.id, 10);
      const bookId = parseInt(request.params.bookId, 10);
      const { coverImageUrl } = request.body;

      await service.assertOwner(tierListId, request.user!.userId);

      // Проверяем, что это data URL
      if (!coverImageUrl || !coverImageUrl.startsWith('data:')) {
        return reply.code(400).send({ error: 'Invalid image format' });
      }

      try {
        // Загружаем изображение на Cloudinary
        const uploadResult = await uploadBase64(coverImageUrl, 'tiermaker-pro/book-covers');

        // Обновляем обложку в базе данных
        const updatedBook = await service.updateBookCover(bookId, uploadResult.url);

        fastify.log.info({ bookId, coverUrl: uploadResult.url }, 'Book cover updated');
        return reply.code(200).send({ coverImageUrl: uploadResult.url });
      } catch (error) {
        fastify.log.error({ error: String(error) }, 'Failed to upload cover image');
        return reply.code(500).send({ error: 'Failed to upload image' });
      }
    }
  );

  // POST /:id/books/search -> Добавить книгу из Open Library
  fastify.post<{
    Params: { id: string };
    Body: { openLibraryKey: string; title: string; author?: string | null; coverUrl: string };
  }>(
    '/:id/books/search',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const tierListId = parseInt(request.params.id);
      const { requestId, userId } = request.context;
      const { title, author, coverUrl } = request.body;

      // Проверяем права
      const tierList = await service.getFullTierList(tierListId);
      if (tierList.userId !== request.user.userId) {
        return reply.code(403).send({ message: 'Forbidden' });
      }

      // Проверяем наличие обложки
      if (!coverUrl) {
        return reply.code(400).send({ error: 'Book has no cover image' });
      }

      try {
        // Загружаем обложку на Cloudinary
        const uploadResult = await uploadFromUrl(coverUrl, 'tiermaker-pro/book-covers');

        // Используем единую функцию для добавления книги в тир-лист
        const results = await addBooksToTierList(tierListId, [{
          title,
          author: author || null,
          coverImageUrl: uploadResult.url,
          description: null,
          thoughts: null,
        }]);

        const createdBook = results[0]?.book;
        if (!createdBook) {
          throw new Error('Failed to create book');
        }
        
        fastify.log.info({ requestId, userId, bookId: createdBook.id, tierListId, coverUrl: uploadResult.url }, 'Book added from Open Library');
        return reply.code(201).send({ book: createdBook });
      } catch (error) {
        fastify.log.error({ requestId, userId, error: String(error) }, 'Failed to add book from Open Library');
        return reply.code(500).send({ error: 'Failed to add book' });
      }
    }
  );

  // PUT /:id/public -> Переключить статус публичности
  fastify.put<{ Params: { id: string }; Body: { isPublic: boolean } }>(
    '/:id/public',
    { preHandler: [authMiddleware], ...schema.togglePublicSchema },
    async (request, reply) => {
      const tierListId = parseInt(request.params.id, 10);
      const tierList = await service.getFullTierList(tierListId);
      if (tierList.userId !== request.user!.userId) {
        return reply.code(403).send({ message: 'You can only change visibility of your own tier lists' });
      }

      const updatedTierList = await service.togglePublic(tierListId, request.body.isPublic);
      return reply.code(200).send(updatedTierList);
    }
  );
}
