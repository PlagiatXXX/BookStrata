/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateUniqueSlug } from "../../utils/slugify.js";
import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";
import type { GetTierListsQuery } from "./tierList.schema.js";

export { prisma };

// Логгер для модуля тир-листов
const logger = createLogger("TierLists", { color: "cyan" });

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value,
  );

const getTierListWhereClause = (tierListId: string) => {
  if (isUuid(tierListId)) return { id: tierListId };
  if (/^\d+$/.test(tierListId)) return { id: tierListId };
  return { slug: tierListId };
};

async function resolveTierListId(tierListId: string): Promise<string> {
  const tierList = await prisma.tierList.findUnique({
    where: getTierListWhereClause(tierListId),
    select: { id: true },
  });
  if (!tierList) {
    throw new Error("Tier list not found");
  }
  return tierList.id;
}

// Получение списка тир-листов пользователя (краткая информация)
export async function getUserTierLists(
  userId: number,
  query: GetTierListsQuery,
) {
  const page = parseInt(query.page, 10);
  const pageSize = parseInt(query.pageSize, 10);
  const skip = (page - 1) * pageSize;

  // Оптимизированный запрос: выбираем только нужные поля
  // Оптимизация Bolt: используем Promise.all вместо $transaction для параллельного выполнения независимых чтений
  const [tierLists, totalItems] = await Promise.all([
    prisma.tierList.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        isPublic: true,
        likesCount: true,
        slug: true, // Оптимизация Bolt: используем денормализованное поле вместо _count.likes
        _count: {
          select: { placements: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: pageSize,
      skip: skip,
    }),
    prisma.tierList.count({
      where: { userId },
    }),
  ]);
  const totalPages = Math.ceil(totalItems / pageSize);

  // Оптимизация Bolt: убрали ненужную загрузку placements/coverImages и user данных для списка в Dashboard
  const data = tierLists.map((tl) => ({
    ...tl,
    booksCount: tl._count?.placements ?? 0,
    _count: undefined,
  }));

  const baseUrl = "/api/tier-lists";
  const links: Record<string, string> = {
    self: `${baseUrl}?page=${page}&pageSize=${pageSize}`,
  };
  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}&pageSize=${pageSize}`;
  }
  if (page > 1) {
    links.prev = `${baseUrl}?page=${page - 1}&pageSize=${pageSize}`;
  }
  links.last = `${baseUrl}?page=${totalPages}&pageSize=${pageSize}`;

  return {
    data,
    meta: {
      totalItems,
      itemCount: tierLists.length,
      itemsPerPage: pageSize,
      totalPages,
      currentPage: page,
    },
    links,
  };
}
// Создание нового тир-листа
export async function createTierList(userId: number, title: string) {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const slug = generateUniqueSlug(title, randomSuffix);
  const tierList = await prisma.tierList.create({
    data: {
      userId,
      title,
      slug,
      isPublic: false,
      tiers: {
        create: [
          { title: "S", color: "#FF6B6B", rank: 0 },
          { title: "A", color: "#4ECDC4", rank: 1 },
          { title: "B", color: "#45B7D1", rank: 2 },
          { title: "C", color: "#96CEB4", rank: 3 },
          { title: "D", color: "#FFEAA7", rank: 4 },
        ],
      },
    },
    include: {
      tiers: {
        orderBy: { rank: "asc" },
        include: {
          items: { orderBy: { rank: "asc" }, include: { book: true } },
        },
      },
      placements: {
        where: { tierId: null },
        include: { book: true },
        orderBy: { rank: "asc" },
      },
    },
  });
  const { placements: unrankedBooks, ...rest } = tierList;
  return { ...rest, unrankedBooks };
}

export async function assertOwner(tierListId: string, userId: number) {
  const list = await prisma.tierList.findUnique({
    where: getTierListWhereClause(tierListId),
    select: { userId: true },
  });

  if (!list || list.userId !== userId) {
    const error = new Error("Forbidden");
    (error as any).statusCode = 403;
    throw error;
  }
}

// Получение полного тир-листа
export async function getFullTierList(id: string) {
  const whereClause = getTierListWhereClause(id);

  const tierList = await prisma.tierList.findUniqueOrThrow({
    where: whereClause,
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true },
      },
      tiers: {
        orderBy: { rank: "asc" },
        include: {
          items: { orderBy: { rank: "asc" }, include: { book: true } },
        },
      },
      placements: {
        where: { tierId: null },
        include: { book: true },
        orderBy: { rank: "asc" },
      },
    },
  });

  const { placements: unrankedBooks, ...rest } = tierList;
  return { ...rest, unrankedBooks };
}

// Обновление позиций (оптимизировано - Promise.all)
export async function updatePlacements(
  tierListId: string,
  placements: { bookId: number; tierId: number | null; rank: number }[],
) {
  const startTime = Date.now();

  if (placements.length === 0) return [];

  const realTierListId = await resolveTierListId(tierListId);

  // Security check (BOLA): Ensure that all non-null tierIds belong to this tier list
  const tierIds = Array.from(
    new Set(
      placements
        .filter((p) => p.tierId !== null)
        .map((p) => p.tierId as number),
    ),
  );

  if (tierIds.length > 0) {
    const tierCount = await prisma.tier.count({
      where: {
        id: { in: tierIds },
        tierListId: realTierListId,
      },
    });

    if (tierCount !== tierIds.length) {
      throw new Error("One or more tiers do not belong to this tier list");
    }
  }

  // Используем upsert вместо update, чтобы создавать записи если их нет
  const transactions = placements.map((p) =>
    prisma.bookPlacement.upsert({
      where: { tierListId_bookId: { tierListId: realTierListId, bookId: p.bookId } },
      update: { tierId: p.tierId, rank: p.rank },
      create: {
        tierListId: realTierListId,
        bookId: p.bookId,
        tierId: p.tierId,
        rank: p.rank,
      },
    }),
  );

  const result = await prisma.$transaction(transactions);

  const totalTime = Date.now() - startTime;
  logger.debug("updatePlacements завершено", {
    placementsCount: placements.length,
    totalTimeMs: totalTime,
  });

  return result;
}

// Добавление новых книг в тир-лист (оптимизировано - bulk insert)
export async function addBooksToTierList(
  tierListId: string,
  books: {
    title: string;
    author?: string | null;
    coverImageUrl: string;
    description?: string | null;
    thoughts?: string | null;
  }[],
) {
  const MAX_BOOKS_PER_TIER_LIST = 20;

  if (books.length === 0) return [];

  const realTierListId = await resolveTierListId(tierListId);

  // Проверка лимита книг
  const existingBooksCount = await prisma.bookPlacement.count({
    where: { tierListId: realTierListId },
  });

  if (existingBooksCount + books.length > MAX_BOOKS_PER_TIER_LIST) {
    throw new Error(
      `Превышен лимит книг в тир-листе. Максимум: ${MAX_BOOKS_PER_TIER_LIST}, текущее количество: ${existingBooksCount}, добавляется: ${books.length}`,
    );
  }

  // Оптимизировано Bolt: Используем одну транзакцию и вложенные create
  // Это сокращает количество запросов с O(N) до O(1) за счет использования возможностей Prisma по вложенному созданию.
  const results = await prisma.$transaction(async (tx) => {
    const updatedTierList = await tx.tierList.update({
      where: { id: realTierListId },
      data: {
        placements: {
          create: books.map((bookData, index) => ({
            rank: existingBooksCount + index,
            book: {
              create: {
                title: bookData.title,
                author: bookData.author ?? null,
                coverImageUrl: bookData.coverImageUrl,
                description: bookData.description ?? null,
                thoughts: bookData.thoughts ?? null,
              },
            },
          })),
        },
      },
      include: {
        placements: {
          where: {
            rank: {
              gte: existingBooksCount,
              lt: existingBooksCount + books.length,
            },
          },
          include: { book: true },
        },
      },
    });

    return updatedTierList.placements;
  });

  return results;
}

// Обновление книги
export async function updateBook(
  tierListId: string,
  bookId: number,
  data: {
    thoughts?: string | null;
    description?: string | null;
    title?: string;
    author?: string | null;
  },
) {
  const whereClause = getTierListWhereClause(tierListId);
  const tierList = await prisma.tierList.findUnique({
    where: whereClause,
    select: { id: true },
  });

  if (!tierList) {
    const error = new Error("Tier list not found");
    (error as any).statusCode = 404;
    throw error;
  }

  const bookPlacement = await prisma.bookPlacement.findUnique({
    where: { tierListId_bookId: { tierListId: tierList.id, bookId } },
  });

  if (!bookPlacement) {
    const error = new Error("Book does not belong to this tier list");
    (error as any).statusCode = 404;
    throw error;
  }

  return prisma.book.update({
    where: { id: bookId },
    data,
  });
}

// Обновление обложки книги
export async function updateBookCover(
  tierListId: string,
  bookId: number,
  coverImageUrl: string,
) {
  const tierList = await prisma.tierList.findUnique({
    where: getTierListWhereClause(tierListId),
    select: { id: true },
  });

  if (!tierList) {
    const error = new Error("Tier list not found");
    (error as any).statusCode = 404;
    throw error;
  }

  const bookPlacement = await prisma.bookPlacement.findUnique({
    where: { tierListId_bookId: { tierListId: tierList.id, bookId } },
  });

  if (!bookPlacement) {
    const error = new Error("Book does not belong to this tier list");
    (error as any).statusCode = 404;
    throw error;
  }

  return prisma.book.update({
    where: { id: bookId },
    data: { coverImageUrl },
  });
}

// Удаление книги из тир-листа
export async function removeBookFromTierList(
  tierListId: string,
  bookId: number,
) {
  const tierList = await prisma.tierList.findUnique({
    where: getTierListWhereClause(tierListId),
    select: { id: true },
  });

  if (!tierList) return;

  await prisma.bookPlacement.deleteMany({
    where: { tierListId: tierList.id, bookId },
  });

  // Оптимизация Bolt: Книга удаляется из базы только если она не используется в других тир-листах
  // В данной реализации мы всегда удаляем книгу, так как каждая книга уникальна для тир-листа
  await prisma.book
    .delete({
      where: { id: bookId },
    })
    .catch(() => {
      // Игнорируем ошибку если книга уже удалена или используется
      logger.debug("Book delete skipped (maybe already deleted or in use)", {
        bookId,
      });
    });
}

// Обновление метаданных тир-листа
export async function updateTierList(
  id: string,
  data: { title?: string; isPublic?: boolean; year?: number },
) {
  return prisma.tierList.update({
    where: getTierListWhereClause(id),
    data,
  });
}

// Удаление тир-листа
export async function deleteTierList(id: string) {
  return prisma.tierList.delete({
    where: getTierListWhereClause(id),
  });
}

// Добавление строки в тир-лист
export async function addTier(tierListId: string, title: string, rank: number) {
  return prisma.tier.create({
    data: {
      tierListId,
      title,
      rank,
      color: "#808080",
    },
  });
}

// Удаление строки из тир-листа
export async function removeTier(tierListId: string, tierId: number) {
  const realTierListId = await resolveTierListId(tierListId);

  // Сначала сбрасываем tierId у всех книг в этой строке
  await prisma.bookPlacement.updateMany({
    where: { tierListId: realTierListId, tierId },
    data: { tierId: null },
  });

  // Затем удаляем саму строку
  return prisma.tier.delete({
    where: { id: tierId },
  });
}

// Обновление строки
export async function updateTier(
  tierListId: string,
  tierId: number,
  data: { title?: string; color?: string; rank?: number },
) {
  const realTierListId = await resolveTierListId(tierListId);

  // Проверяем принадлежность строки к тир-листу (BOLA)
  const tier = await prisma.tier.findUnique({
    where: { id: tierId },
    select: { tierListId: true },
  });

  if (!tier || tier.tierListId !== realTierListId) {
    const error = new Error("Forbidden");
    (error as any).statusCode = 403;
    throw error;
  }

  return prisma.tier.update({
    where: { id: tierId },
    data,
  });
}

// Обновление всех строк сразу
export async function updateTiers(
  tierListId: string,
  tiers: { id: number; title?: string; color?: string; rank?: number }[],
) {
  const realTierListId = await resolveTierListId(tierListId);

  const transactions = tiers.map((t) =>
    prisma.tier.updateMany({
      where: { id: t.id, tierListId: realTierListId },
      data: {
        ...(t.title !== undefined ? { title: t.title } : {}),
        ...(t.color !== undefined ? { color: t.color } : {}),
        ...(t.rank !== undefined ? { rank: t.rank } : {}),
      },
    }),
  );

  return prisma.$transaction(transactions);
}

// Сохранение тиров (diff — только изменения, оптимизировано)
export async function saveTiers(
  tierListId: string,
  tiers:
    | {
        added?: Array<{ title: string; color: string; rank: number }>;
        updated?: Array<{
          id: number;
          title: string;
          color: string;
          rank: number;
        }>;
        deletedIds?: number[];
      }
    | Array<{ id?: number; title: string; color: string; rank: number }>,
) {
  const startTime = Date.now();
  const realTierListId = await resolveTierListId(tierListId);

  // Определяем формат
  const isDiff = "added" in (tiers as any);

  let added: Array<{ title: string; color: string; rank: number }> = [];
  let updated: Array<{
    id: number;
    title: string;
    color: string;
    rank: number;
  }> = [];
  let deletedIds: number[] = [];

  if (isDiff) {
    added = (tiers as any).added || [];
    updated = (tiers as any).updated || [];
    deletedIds = (tiers as any).deletedIds || [];
  } else {
    // Полный массив
    const tiersArray = tiers as Array<{
      id?: number;
      title: string;
      color: string;
      rank: number;
    }>;
    added = tiersArray
      .filter((t) => !t.id)
      .map((t) => ({ title: t.title, color: t.color, rank: t.rank }));
    updated = tiersArray
      .filter((t) => t.id)
      .map((t) => ({
        id: t.id!,
        title: t.title,
        color: t.color,
        rank: t.rank,
      }));
  }

  // Одна транзакция для всех операций
  const results = await prisma.$transaction(async (tx) => {
    // 1. Удаляем
    if (deletedIds.length > 0) {
      await tx.tier.deleteMany({
        where: { id: { in: deletedIds }, tierListId: realTierListId },
      });
    }

    // 2. Создаём новые (bulk)
    if (added.length > 0) {
      await tx.tier.createMany({
        data: added.map((tier) => ({
          tierListId: realTierListId,
          title: tier.title,
          color: tier.color,
          rank: tier.rank,
        })),
      });
    }

    // 3. Обновляем существующие (параллельно, с проверкой владения)
    if (updated.length > 0) {
      await Promise.all(
        updated.map((tier) =>
          tx.tier.updateMany({
            where: { id: tier.id, tierListId: realTierListId },
            data: { title: tier.title, color: tier.color, rank: tier.rank },
          }),
        ),
      );
    }

    // 4. Получаем все тиры для возврата
    const allTiers = await tx.tier.findMany({
      where: { tierListId: realTierListId },
      orderBy: { rank: "asc" },
    });

    return allTiers;
  });

  const totalTime = Date.now() - startTime;
  logger.debug("saveTiers завершено", {
    added: added.length,
    updated: updated.length,
    deleted: deletedIds.length,
    totalTimeMs: totalTime,
  });

  // Формируем ответ в старом формате для совместимости
  if (!results || results.length === 0) {
    return [];
  }

  const createdTiers = results.filter(
    (t: any) => !updated.some((u: any) => u.id === t.id),
  );
  const updatedTierList = results.filter((t: any) =>
    updated.some((u: any) => u.id === t.id),
  );

  return [
    ...createdTiers.map((t: any) => ({ ...t, isNew: true })),
    ...updatedTierList.map((t: any) => ({ ...t, isNew: false })),
  ];
}

// Переключение статуса публичности
export async function togglePublic(tierListId: string, isPublic: boolean) {
  return prisma.tierList.update({
    where: getTierListWhereClause(tierListId),
    data: { isPublic },
    select: { id: true, isPublic },
  });
}

// Поиск публичных тир-листов
export async function getPublicTierLists(query: GetTierListsQuery) {
  const page = parseInt(query.page, 10);
  const pageSize = parseInt(query.pageSize, 10);
  const skip = (page - 1) * pageSize;
  const orderBy =
    query.sortBy === "likes"
      ? { likesCount: "desc" as const }
      : query.sortBy === "updatedAt" || query.sortBy === "updated_at"
        ? { updatedAt: "desc" as const }
        : { createdAt: "desc" as const };

  const [tierLists, totalItems] = await Promise.all([
    prisma.tierList.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        isPublic: true,
        likesCount: true,
        slug: true,
        user: {
          select: { username: true, avatarUrl: true },
        },
        _count: {
          select: { placements: true },
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

  const totalPages = Math.ceil(totalItems / pageSize);

  const baseUrl = "/api/tier-lists/public";
  const links: Record<string, string> = {
    self: `${baseUrl}?page=${page}&pageSize=${pageSize}&sortBy=${query.sortBy || "updated_at"}`,
  };
  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}&pageSize=${pageSize}&sortBy=${query.sortBy || "updated_at"}`;
  }
  if (page > 1) {
    links.prev = `${baseUrl}?page=${page - 1}&pageSize=${pageSize}&sortBy=${query.sortBy || "updated_at"}`;
  }
  links.last = `${baseUrl}?page=${totalPages}&pageSize=${pageSize}&sortBy=${query.sortBy || "updated_at"}`;

  return {
    data: tierLists.map((tl) => ({
      ...tl,
      authorName: tl.user?.username || "Anonymous",
      authorAvatar: tl.user?.avatarUrl,
      booksCount: tl._count?.placements ?? 0,
      _count: undefined,
    })),
    meta: {
      totalItems,
      totalPages,
      currentPage: page,
    },
    links,
  };
}

// Очистка всех строк (перевод книг в нераспределенные)
export async function clearAllTiers(tierListId: string) {
  const realTierListId = await resolveTierListId(tierListId);
  return prisma.bookPlacement.updateMany({
    where: { tierListId: realTierListId },
    data: { tierId: null },
  });
}

// Получить количество книг в тир-листе
export async function getTierListBooksCount(
  tierListId: string,
): Promise<number> {
  const realTierListId = await resolveTierListId(tierListId);
  const count = await prisma.bookPlacement.count({
    where: { tierListId: realTierListId },
  });
  return count;
}

// Дополнительная оптимизация для получения списка
export async function getTierListMetadata(id: string) {
  return prisma.tierList.findUnique({
    where: getTierListWhereClause(id),
    select: {
      id: true,
      title: true,
      userId: true,
      isPublic: true,
      updatedAt: true,
    },
  });
}

// Создание копии (форка) тир-листа
export async function forkTierList(id: string, userId: number) {
  logger.debug("forkTierList вызван", { id, userId });

  // 1. Получаем оригинал со всеми данными
  const original = await prisma.tierList.findUniqueOrThrow({
    where: getTierListWhereClause(id),
    include: {
      tiers: {
        orderBy: { rank: "asc" },
      },
      placements: {
        include: { book: true },
        orderBy: { rank: "asc" },
      },
    },
  });

  // Security Check (BOLA): Ensure the list is public OR owned by the user
  if (!original.isPublic && original.userId !== userId) {
    logger.warn("Security Alert: Attempt to fork private tier list", {
      originalId: id,
      requesterUserId: userId,
      ownerUserId: original.userId,
    });
    const error = new Error("Forbidden");
    (error as any).statusCode = 403;
    throw error;
  }

  // 2. Создаем новый тир-лист с тирами в одном запросе
  return prisma.$transaction(async (tx) => {
    const newTierList = await tx.tierList.create({
      data: {
        userId,
        title: `${original.title} (копия)`,
        isPublic: false,
        tiers: {
          create: original.tiers.map((tier) => ({
            title: tier.title,
            color: tier.color,
            rank: tier.rank,
          })),
        },
      },
      include: {
        tiers: {
          orderBy: { rank: "asc" },
        },
      },
    });

    const tierMap = new Map<number, number>(); // Старый ID -> Новый ID
    if (newTierList.tiers.length === original.tiers.length) {
      original.tiers.forEach((oldTier, index) => {
        const newTier = newTierList.tiers[index];
        if (!newTier) return;
        tierMap.set(oldTier.id, newTier.id);
      });
    }

    // 4. Копируем книги и создаем размещения (Оптимизировано Bolt: O(1) roundtrip)
    // Используем вложенный create в update для создания всех книг и их размещений за один запрос к БД.
    // Это сокращает количество последовательных roundtrip-ов с O(N) до O(1).
    const placementCreates = original.placements.map((placement) => {
      const mappedTierId =
        placement.tierId === null ? null : tierMap.get(placement.tierId);

      if (placement.tierId !== null && mappedTierId === undefined) {
        throw new Error(
          `Mapped tier ID not found for source tier ID: ${placement.tierId}`,
        );
      }

      return {
        rank: placement.rank,
        ...(mappedTierId !== null && mappedTierId !== undefined
          ? {
              tier: {
                connect: { id: mappedTierId },
              },
            }
          : {}),
        book: {
          create: {
            title: placement.book.title,
            author: placement.book.author,
            coverImageUrl: placement.book.coverImageUrl,
            description: placement.book.description,
            thoughts: placement.book.thoughts,
          },
        },
      };
    });

    await tx.tierList.update({
      where: { id: newTierList.id },
      data: {
        placements: {
          create: placementCreates,
        },
      },
    });

    logger.info("Тир-лист успешно скопирован (forked)", {
      originalId: id,
      newId: newTierList.id,
      userId,
    });

    return newTierList;
  });
}

/**
 * Атомарное сохранение всех изменений в тир-листе
 */
export async function saveAll(
  tierListId: string,
  userId: number,
  payload: {
    tiers?: {
      added?: Array<{
        tempId: string;
        title: string;
        color: string;
        rank: number;
      }>;
      updated?: Array<{
        id: number;
        title: string;
        color: string;
        rank: number;
      }>;
      deletedIds?: number[];
    };
    newBooks?: Array<{
      tempId: string;
      title: string;
      author?: string | null;
      coverImageUrl: string;
      description?: string | null;
      thoughts?: string | null;
    }>;
    placements?: Array<{
      bookId: string | number;
      tierId: string | number | null;
      rank: number;
    }>;
  },
) {
  return await prisma.$transaction(async (tx) => {
    const MAX_BOOKS_PER_TIER_LIST = 20;

    // Получаем реальный UUID тир-листа (slug может быть передан из URL)
    const tierList = await tx.tierList.findUnique({
      where: getTierListWhereClause(tierListId),
      select: { id: true },
    });

    if (!tierList) {
      throw new Error("Tier list not found");
    }

    const realTierListId = tierList.id;

    // 1. Проверка лимита книг
    const newBooksCount = payload.newBooks?.length || 0;
    const existingBookIdsInPlacements = new Set<number>();

    if (payload.placements?.length) {
      for (const p of payload.placements) {
        if (typeof p.bookId === "number") {
          existingBookIdsInPlacements.add(p.bookId);
        } else if (typeof p.bookId === "string" && !p.bookId.includes("-")) {
          const parsed = parseInt(p.bookId, 10);
          if (!isNaN(parsed)) {
            existingBookIdsInPlacements.add(parsed);
          }
        }
      }
    }

    const totalBooksCount = existingBookIdsInPlacements.size + newBooksCount;

    if (totalBooksCount > MAX_BOOKS_PER_TIER_LIST) {
      throw new Error(
        `Превышен лимит книг в тир-листе. Максимум: ${MAX_BOOKS_PER_TIER_LIST}, запрошено: ${totalBooksCount}`
      );
    }

    // 2. Обработка тиров
    const tierReplacements: { tempId: string; realId: string }[] = [];
    const bookReplacements: { tempId: string; realId: string }[] = [];

    if (payload.tiers) {
      // Удаление
      if (payload.tiers.deletedIds?.length) {
        await tx.tier.deleteMany({
          where: { id: { in: payload.tiers.deletedIds }, tierListId: realTierListId },
        });
      }
      // Обновление существующих (с проверкой владения)
      if (payload.tiers.updated?.length) {
        for (const tier of payload.tiers.updated) {
          await tx.tier.updateMany({
            where: { id: tier.id, tierListId: realTierListId },
            data: { title: tier.title, color: tier.color, rank: tier.rank },
          });
        }
      }
      // Добавление новых
      if (payload.tiers.added?.length) {
        const addedTiers = payload.tiers.added;
        for (const tier of addedTiers) {
          const created = await tx.tier.create({
            data: {
              tierListId: realTierListId,
              title: tier.title,
              color: tier.color,
              rank: tier.rank,
            },
          });
          if (created) {
            tierReplacements.push({
              tempId: tier.tempId,
              realId: String(created.id),
            });
          }
        }
      }
    }

    // 3. Обработка книг
    if (payload.newBooks?.length) {
      const newBooksData = payload.newBooks;
      for (const bookData of newBooksData) {
        const created = await tx.book.create({
          data: {
            title: bookData.title,
            author: bookData.author ?? null,
            coverImageUrl: bookData.coverImageUrl,
            description: bookData.description ?? null,
            thoughts: bookData.thoughts ?? null,
          },
        });
        bookReplacements.push({
          tempId: bookData.tempId,
          realId: String(created.id),
        });
      }
    }

    // 4. Обновление позиций (Placements)
    if (payload.placements?.length) {
      // Оптимизация Bolt: используем Map для O(1) поиска замен ID вместо O(N) поиска в массиве
      const bookReplacementMap = new Map(
        bookReplacements.map((r) => [r.tempId, r.realId]),
      );
      const tierReplacementMap = new Map(
        tierReplacements.map((r) => [r.tempId, r.realId]),
      );

      // Security check (BOLA): Ensure that all non-temporary bookIds belong to this tier list
      const existingBookIds = Array.from(
        new Set(
          payload.placements
            .filter(
              (p) => typeof p.bookId !== "string" || !p.bookId.includes("-"),
            )
            .map((p) =>
              typeof p.bookId === "string" ? parseInt(p.bookId, 10) : p.bookId,
            ),
        ),
      );

      if (existingBookIds.length > 0) {
        const userTierLists = await tx.tierList.findMany({
          where: { userId },
          select: { id: true },
        });
        const userTierListIds = userTierLists.map((tl) => tl.id);

        const count = await tx.bookPlacement.count({
          where: {
            bookId: { in: existingBookIds },
            tierListId: { in: userTierListIds },
          },
        });

        if (count !== existingBookIds.length) {
          throw new Error("One or more books do not belong to this user");
        }
      }

      // Security check (BOLA): Ensure that all non-temporary tierIds belong to this tier list
      const existingTierIds = Array.from(
        new Set(
          payload.placements
            .filter(
              (p) =>
                p.tierId !== null &&
                (typeof p.tierId !== "string" || !p.tierId.includes("-")),
            )
            .map((p) =>
              typeof p.tierId === "string" ? parseInt(p.tierId, 10) : p.tierId!,
            ),
        ),
      );

      if (existingTierIds.length > 0) {
        const tierCount = await tx.tier.count({
          where: {
            id: { in: existingTierIds },
            tierListId: realTierListId,
          },
        });

        if (tierCount !== existingTierIds.length) {
          throw new Error("One or more tiers do not belong to this tier list");
        }
      }

      // Сначала удаляем все старые позиции для этого тир-листа (атомарная перезапись)
      // ВАЖНО: Мы удаляем только связи, а не сами книги
      await tx.bookPlacement.deleteMany({
        where: { tierListId: realTierListId },
      });

      // Создаем новые позиции
      const placementData = payload.placements.map((p) => {
        let finalBookId: number;
        if (typeof p.bookId === "string" && p.bookId.includes("-")) {
          // Это временный ID, ищем в Map (O(1))
          const realId = bookReplacementMap.get(p.bookId);
          if (!realId)
            throw new Error(`Real ID not found for temp book ID: ${p.bookId}`);
          finalBookId = parseInt(realId, 10);
        } else {
          finalBookId =
            typeof p.bookId === "string" ? parseInt(p.bookId, 10) : p.bookId;
        }

        let finalTierId: number | null = null;
        if (p.tierId !== null) {
          if (typeof p.tierId === "string" && p.tierId.includes("-")) {
            // Ищем в Map (O(1))
            const realId = tierReplacementMap.get(p.tierId);
            if (!realId)
              throw new Error(
                `Real ID not found for temp tier ID: ${p.tierId}`,
              );
            finalTierId = parseInt(realId, 10);
          } else {
            finalTierId =
              typeof p.tierId === "string" ? parseInt(p.tierId, 10) : p.tierId;
          }
        }

        return {
          tierListId: realTierListId,
          bookId: finalBookId,
          tierId: finalTierId,
          rank: p.rank,
        };
      });

      await tx.bookPlacement.createMany({
        data: placementData,
      });
    }

    // Обновляем updatedAt тир-листа
    await tx.tierList.update({
      where: getTierListWhereClause(tierListId),
      data: { updatedAt: new Date() },
    });

    return {
      bookReplacements,
      tierReplacements,
    };
  });
}
