/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../../lib/prisma.js';
import { createLogger } from '../../lib/logger.js';
import type { GetTierListsQuery } from './tierList.schema.js';

export { prisma };

// Логгер для модуля тир-листов
const logger = createLogger('TierLists', { color: 'cyan' });

// Получение списка тир-листов пользователя (краткая информация)
export async function getUserTierLists(userId: number, query: GetTierListsQuery) {
  const page = parseInt(query.page, 10);
  const pageSize = parseInt(query.pageSize, 10);
  const skip = (page - 1) * pageSize;
  const [tierLists, totalItems] = await prisma.$transaction([
    prisma.tierList.findMany({
      where: { userId },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: pageSize,
      skip: skip,
    }),
    prisma.tierList.count({
      where: { userId },
    }),
  ]);
  const totalPages = Math.ceil(totalItems / pageSize);

  // Добавляем likesCount в ответ
  const data = tierLists.map((tl) => ({
    ...tl,
    user: tl.user,
    likesCount: tl._count.likes,
    _count: undefined,
  }));

  return {
    data,
    meta: {
      totalItems,
      itemCount: tierLists.length,
      itemsPerPage: pageSize,
      totalPages,
      currentPage: page,
    },
  };
}
// Создание нового тир-листа
export async function createTierList(userId: number, title: string) {
  const tierList = await prisma.tierList.create({
    data: {
      userId,
      title,
      isPublic: false,
      tiers: {
        create: [
          { title: 'S', color: '#FF6B6B', rank: 0 },
          { title: 'A', color: '#4ECDC4', rank: 1 },
          { title: 'B', color: '#45B7D1', rank: 2 },
          { title: 'C', color: '#96CEB4', rank: 3 },
          { title: 'D', color: '#FFEAA7', rank: 4 },
        ],
      },
    },
    include: {
      tiers: {
        orderBy: { rank: 'asc' },
        include: { items: { orderBy: { rank: 'asc' }, include: { book: true } } },
      },
      placements: {
        where: { tierId: null },
        include: { book: true },
        orderBy: { rank: 'asc' },
      },
    },
  });
  const { placements: unrankedBooks, ...rest } = tierList;
  return { ...rest, unrankedBooks };
}

export async function assertOwner(tierListId: number, userId: number) {
  const list = await prisma.tierList.findUnique({
    where: { id: tierListId },
    select: { userId: true },
  });

  if (!list || list.userId !== userId) {
    const error = new Error('Forbidden');
    (error as any).statusCode = 403;
    throw error;
  }
}

// Получение полного тир-листа
export async function getFullTierList(id: number) {
  const tierList = await prisma.tierList.findUniqueOrThrow({
    where: { id },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true },
      },
      tiers: {
        orderBy: { rank: 'asc' },
        include: { items: { orderBy: { rank: 'asc' }, include: { book: true } } },
      },
      placements: {
        where: { tierId: null },
        include: { book: true },
        orderBy: { rank: 'asc' },
      },
      _count: {
        select: { likes: true },
      },
    },
  });
  
  const { placements: unrankedBooks, _count, ...rest } = tierList;
  return { ...rest, unrankedBooks, likesCount: _count.likes };
}

// Обновление позиций (оптимизировано - Promise.all)
export async function updatePlacements(tierListId: number, placements: { bookId: number; tierId: number | null; rank: number }[]) {
  const startTime = Date.now();

  if (placements.length === 0) return [];

  // Используем upsert вместо update, чтобы создавать записи если их нет
  const transactions = placements.map((p) =>
    prisma.bookPlacement.upsert({
      where: { tierListId_bookId: { tierListId, bookId: p.bookId } },
      update: { tierId: p.tierId, rank: p.rank },
      create: {
        tierListId,
        bookId: p.bookId,
        tierId: p.tierId,
        rank: p.rank,
      },
    })
  );

  const result = await prisma.$transaction(transactions);

  const totalTime = Date.now() - startTime;
  logger.debug('updatePlacements завершено', { 
    placementsCount: placements.length, 
    totalTimeMs: totalTime 
  });

  return result;
}

// Добавление новых книг в тир-лист (оптимизировано - bulk insert)
export async function addBooksToTierList(
  tierListId: number,
  books: { title: string; author?: string | null; coverImageUrl: string; description?: string | null; thoughts?: string | null }[]
) {

  if (books.length === 0) return [];

  // Используем одну транзакцию для всех операций
  const results = await prisma.$transaction(async (tx) => {
    const currentCount = await tx.bookPlacement.count({
      where: { tierListId, tierId: null },
    });
    const createBookPromises = books.map((bookData) =>
      tx.book.create({
        data: {
          title: bookData.title,
          author: bookData.author ?? null,
          coverImageUrl: bookData.coverImageUrl,
          description: bookData.description ?? null,
          thoughts: bookData.thoughts ?? null,
        },
      })
    );

    const createdBooks = await Promise.all(createBookPromises);

    const createPlacementPromises = createdBooks.map((book, index) =>
      tx.bookPlacement.create({
        data: {
          tierListId,
          bookId: book.id,
          tierId: null,
          rank: currentCount + index, // Сохраняем порядок
        },
        include: { book: true },
      })
    );
    
    const placements = await Promise.all(createPlacementPromises);
    
    // Возвращаем в формате [{ book: {...} }]
    return placements.map(placement => ({ book: placement.book }));
  });
  
  return results;
}

// Обновление книги
export async function updateBook(bookId: number, data: { title?: string; author?: string | null; description?: string | null; thoughts?: string | null }) {
  return prisma.book.update({
    where: { id: bookId },
    data,
  });
}

// Обновление обложки книги
export async function updateBookCover(bookId: number, coverImageUrl: string) {
  return prisma.book.update({
    where: { id: bookId },
    data: { coverImageUrl },
  });
}

// Удаление книги из тир-листа
export async function removeBookFromTierList(tierListId: number, bookId: number) {
  return prisma.bookPlacement.delete({
    where: { tierListId_bookId: { tierListId, bookId } },
  });
}

// Удаление тир-листа
export async function deleteTierList(tierListId: number) {
  return prisma.tierList.delete({
    where: { id: tierListId },
  });
}

// Сохранение тиров (diff — только изменения, оптимизировано)
export async function saveTiers(
  tierListId: number,
  tiers:
    | { added?: Array<{ title: string; color: string; rank: number }>; updated?: Array<{ id: number; title: string; color: string; rank: number }>; deletedIds?: number[] }
    | Array<{ id?: number; title: string; color: string; rank: number }>
) {
  const startTime = Date.now();

  // Определяем формат
  const isDiff = 'added' in (tiers as any);

  let added: Array<{ title: string; color: string; rank: number }> = [];
  let updated: Array<{ id: number; title: string; color: string; rank: number }> = [];
  let deletedIds: number[] = [];

  if (isDiff) {
    added = (tiers as any).added || [];
    updated = (tiers as any).updated || [];
    deletedIds = (tiers as any).deletedIds || [];
  } else {
    // Полный массив
    const tiersArray = tiers as Array<{ id?: number; title: string; color: string; rank: number }>;
    added = tiersArray.filter((t) => !t.id).map((t) => ({ title: t.title, color: t.color, rank: t.rank }));
    updated = tiersArray.filter((t) => t.id).map((t) => ({ id: t.id!, title: t.title, color: t.color, rank: t.rank }));
  }

  // Одна транзакция для всех операций
  const results = await prisma.$transaction(async (tx) => {
    // 1. Удаляем
    if (deletedIds.length > 0) {
      await tx.tier.deleteMany({
        where: { id: { in: deletedIds }, tierListId },
      });
    }

    // 2. Создаём новые (bulk)
    if (added.length > 0) {
      await tx.tier.createMany({
        data: added.map((tier) => ({
          tierListId,
          title: tier.title,
          color: tier.color,
          rank: tier.rank,
        })),
      });
    }

    // 3. Обновляем существующие (параллельно)
    if (updated.length > 0) {
      await Promise.all(
        updated.map((tier) =>
          tx.tier.update({
            where: { id: tier.id },
            data: { title: tier.title, color: tier.color, rank: tier.rank },
          })
        )
      );
    }

    // 4. Получаем все тиры для возврата
    const allTiers = await tx.tier.findMany({
      where: { tierListId },
      orderBy: { rank: 'asc' },
    });

    return allTiers;
  });

  const totalTime = Date.now() - startTime;
  logger.debug('saveTiers завершено', {
    added: added.length,
    updated: updated.length,
    deleted: deletedIds.length,
    totalTimeMs: totalTime
  });

  // Формируем ответ в старом формате для совместимости
  const createdTiers = results.filter((t: any) => !updated.some((u: any) => u.id === t.id));
  const updatedTierList = results.filter((t: any) => updated.some((u: any) => u.id === t.id));

  return [...createdTiers.map((t: any) => ({ ...t, isNew: true })), ...updatedTierList.map((t: any) => ({ ...t, isNew: false }))];
}

// Переключение статуса публичности
export async function togglePublic(tierListId: number, isPublic: boolean) {
  return prisma.tierList.update({
    where: { id: tierListId },
    data: { isPublic },
    select: { id: true, isPublic },
  });
}

// Получение публичных тир-листов
export async function getPublicTierLists(query: GetTierListsQuery) {
  logger.debug('getPublicTierLists вызван', { query });

  const page = parseInt(query.page, 10);
  const pageSize = parseInt(query.pageSize, 10);
  const skip = (page - 1) * pageSize;

  logger.debug('Парсинг параметров пагинации', { page, pageSize, skip });

  // Преобразуем возможные варианты sortBy в удобный для дальнейшей обработки формат
  const sortBy = query.sortBy === 'updated_at' ? 'updatedAt' :
                 query.sortBy === 'created_at' ? 'createdAt' :
                 query.sortBy || 'updatedAt';

  // Определяем сортировку
  let orderBy: any = { updatedAt: 'desc' };
  let sortByLikes = false;

  if (sortBy === 'likes') {
    sortByLikes = true;
    orderBy = { updatedAt: 'desc' }; // Временная сортировка, потом отсортируем по лайкам
  } else if (sortBy === 'createdAt') {
    orderBy = { createdAt: 'desc' };
  }

  let tierLists: any[] = [];
  let totalItems = 0;
  
  if (sortByLikes) {
    // Для сортировки по лайкам загружаем все записи, сортируем и применяем пагинацию
    // Это менее эффективно, но необходимо для правильной сортировки
    try {
      const allTierLists = await prisma.tierList.findMany({
        where: { isPublic: true },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          isPublic: true,
          user: {
            select: { id: true, username: true, avatarUrl: true },
          },
          _count: {
            select: { likes: true },
          },
        },
      });
      
      // Добавляем likesCount и сортируем по лайкам
      const allWithLikes = allTierLists.map((tl) => ({
        ...tl,
        likesCount: tl._count.likes,
        _count: undefined,
      }));
      
      // Сортируем по количеству лайков (по убыванию)
      allWithLikes.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
      
      // Применяем пагинацию
      totalItems = allWithLikes.length;
      tierLists = allWithLikes.slice(skip, skip + pageSize);

    } catch (err) {
      logger.error(err as Error, { function: 'getPublicTierLists', sort: 'likes' });
      throw err;
    }
  } else {
    // Обычная сортировка (по дате) - используем пагинацию на уровне БД
    try {
      [tierLists, totalItems] = await prisma.$transaction([
        prisma.tierList.findMany({
          where: { isPublic: true },
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            isPublic: true,
            user: {
              select: { id: true, username: true, avatarUrl: true },
            },
            _count: {
              select: { likes: true },
            },
          },
          orderBy,
          take: pageSize,
          skip: skip,
        }),
        prisma.tierList.count({
          where: { isPublic: true },
        }),
      ]);
      
      // Добавляем likesCount в ответ
      tierLists = tierLists.map((tl) => ({
        ...tl,
        likesCount: tl._count.likes,
        _count: undefined,
      }));

    } catch (err) {
      logger.error(err as Error, { function: 'getPublicTierLists', step: 'transaction' });
      throw err;
    }
  }

  const totalPages = Math.ceil(totalItems / pageSize);
  const responseData = {
    data: tierLists,
    meta: {
      totalItems,
      itemCount: tierLists.length,
      itemsPerPage: pageSize,
      totalPages,
      currentPage: page,
    },
  };
  
  logger.debug('getPublicTierLists завершено', {
    page,
    pageSize,
    totalItems,
    totalPages,
    returnedCount: tierLists.length
  });
  
  return responseData;
}
