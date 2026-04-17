/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";
import type { GetTierListsQuery } from "./tierList.schema.js";

export { prisma };

// Логгер для модуля тир-листов
const logger = createLogger("TierLists", { color: "cyan" });

// Получение списка тир-листов пользователя (краткая информация)
export async function getUserTierLists(
  userId: number,
  query: GetTierListsQuery,
) {
  const page = parseInt(query.page, 10);
  const pageSize = parseInt(query.pageSize, 10);
  const skip = (page - 1) * pageSize;

  // Оптимизированный запрос: выбираем только нужные поля
  const [tierLists, totalItems] = await prisma.$transaction([
    prisma.tierList.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        isPublic: true,
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
        likesCount: true, // Оптимизация Bolt: используем денормализованное поле вместо _count.likes
        _count: {
          select: { placements: true },
        },
        placements: {
          select: {
            book: {
              select: { coverImageUrl: true },
            },
          },
          take: 4,
          orderBy: { rank: "asc" },
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

  // Добавляем booksCount и coverImages в ответ
  const data = tierLists.map((tl) => ({
    ...tl,
    booksCount: tl._count.placements,
    coverImages: tl.placements.map((p) => p.book.coverImageUrl).filter(Boolean),
    placements: undefined,
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

export async function assertOwner(tierListId: number, userId: number) {
  const list = await prisma.tierList.findUnique({
    where: { id: tierListId },
    select: { userId: true },
  });

  if (!list || list.userId !== userId) {
    const error = new Error("Forbidden");
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
  tierListId: number,
  placements: { bookId: number; tierId: number | null; rank: number }[],
) {
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
  tierListId: number,
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

  // Проверка лимита книг
  const existingBooksCount = await prisma.bookPlacement.count({
    where: { tierListId },
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
      where: { id: tierListId },
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

    // Возвращаем новые книги
    return updatedTierList.placements.map((placement) => ({
      book: placement.book,
    }));
  });

  return results;
}

// Обновление книги
export async function updateBook(
  tierListId: number,
  bookId: number,
  data: {
    title?: string;
    author?: string | null;
    description?: string | null;
    thoughts?: string | null;
  },
) {
  // Security check: ensure the book belongs to the tier list
  await prisma.bookPlacement.findUniqueOrThrow({
    where: { tierListId_bookId: { tierListId, bookId } },
  });

  return prisma.book.update({
    where: { id: bookId },
    data,
  });
}

// Обновление обложки книги
export async function updateBookCover(
  tierListId: number,
  bookId: number,
  coverImageUrl: string,
) {
  // Security check: ensure the book belongs to the tier list
  await prisma.bookPlacement.findUniqueOrThrow({
    where: { tierListId_bookId: { tierListId, bookId } },
  });

  return prisma.book.update({
    where: { id: bookId },
    data: { coverImageUrl },
  });
}

// Удаление книги из тир-листа
export async function removeBookFromTierList(
  tierListId: number,
  bookId: number,
) {
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
          }),
        ),
      );
    }

    // 4. Получаем все тиры для возврата
    const allTiers = await tx.tier.findMany({
      where: { tierListId },
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
export async function togglePublic(tierListId: number, isPublic: boolean) {
  return prisma.tierList.update({
    where: { id: tierListId },
    data: { isPublic },
    select: { id: true, isPublic },
  });
}

// Получение публичных тир-листов
export async function getPublicTierLists(query: GetTierListsQuery) {
  logger.debug("getPublicTierLists вызван", { query });

  const page = parseInt(query.page, 10);
  const pageSize = parseInt(query.pageSize, 10);
  const skip = (page - 1) * pageSize;

  logger.debug("Парсинг параметров пагинации", { page, pageSize, skip });

  // Преобразуем возможные варианты sortBy в удобный для дальнейшей обработки формат
  const sortByField =
    query.sortBy === "updated_at" || query.sortBy === "updatedAt"
      ? "updatedAt"
      : query.sortBy === "created_at" ||
          (query.sortBy as string) === "createdAt"
        ? "createdAt"
        : query.sortBy === "likes"
          ? "likesCount"
          : "updatedAt";

  // Определяем сортировку
  const orderBy: any = { [sortByField]: "desc" };

  let tierLists: any[] = [];
  let totalItems = 0;

  // Обычная сортировка - используем пагинацию на уровне БД
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
          likesCount: true,
          user: {
            select: { id: true, username: true, avatarUrl: true },
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
  } catch (err) {
    logger.error(err as Error, {
      function: "getPublicTierLists",
      step: "transaction",
    });
    throw err;
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

  logger.debug("getPublicTierLists завершено", {
    page,
    pageSize,
    totalItems,
    totalPages,
    returnedCount: tierLists.length,
  });

  return responseData;
}

// Получить количество книг в тир-листе
export async function getTierListBooksCount(
  tierListId: number,
): Promise<number> {
  const count = await prisma.bookPlacement.count({
    where: { tierListId },
  });
  return count;
}

// Дополнительная оптимизация для получения списка
export async function getTierListMetadata(id: number) {
  return prisma.tierList.findUnique({
    where: { id },
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
export async function forkTierList(id: number, userId: number) {
  logger.debug("forkTierList вызван", { id, userId });

  // 1. Получаем оригинал со всеми данными
  const original = await prisma.tierList.findUniqueOrThrow({
    where: { id },
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
    original.tiers.forEach((oldTier, index) => {
      const newTier = newTierList.tiers[index];
      if (!newTier) return;
      tierMap.set(oldTier.id, newTier.id);
    });

    // 4. Копируем книги и создаем размещения (Оптимизировано Bolt: O(1) roundtrip)
    // Используем вложенный create в update для создания всех книг и их размещений за один запрос к БД.
    // Это сокращает количество последовательных roundtrip-ов с O(N) до O(1).
    await tx.tierList.update({
      where: { id: newTierList.id },
      data: {
        placements: {
          create: original.placements.map((placement) => ({
            rank: placement.rank,
            tierId: placement.tierId
              ? (tierMap.get(placement.tierId) ?? null)
              : null,
            book: {
              create: {
                title: placement.book.title,
                author: placement.book.author,
                coverImageUrl: placement.book.coverImageUrl,
                description: placement.book.description,
                thoughts: placement.book.thoughts,
              },
            },
          })),
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
  tierListId: number,
  userId: number,
  payload: {
    tiers?: {
      added?: Array<{ tempId: string; title: string; color: string; rank: number }>;
      updated?: Array<{ id: number; title: string; color: string; rank: number }>;
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
  }
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Проверяем владельца (уже сделано в роуте через assertOwner, но для надежности здесь тоже можно)
    // const tl = await tx.tierList.findUniqueOrThrow({ where: { id: tierListId } });
    // if (tl.userId !== userId) throw new Error("Forbidden");

    // Оптимизация Bolt: использование Map для O(1) поиска замен ID
    const tierReplacementsMap = new Map<string, string>();
    const bookReplacementsMap = new Map<string, string>();

    // 2. Обработка тиров
    if (payload.tiers) {
      // Удаление
      if (payload.tiers.deletedIds?.length) {
        await tx.tier.deleteMany({
          where: { id: { in: payload.tiers.deletedIds }, tierListId },
        });
      }

      // Оптимизация Bolt: параллельное обновление и создание тиров
      // Это сокращает количество последовательных roundtrip-ов к БД с O(N) до O(1).
      const updatePromises = (payload.tiers.updated || []).map((tier) =>
        tx.tier.update({
          where: { id: tier.id },
          data: { title: tier.title, color: tier.color, rank: tier.rank },
        }),
      );

      const createPromises = (payload.tiers.added || []).map((tier) =>
        tx.tier
          .create({
            data: {
              tierListId,
              title: tier.title,
              color: tier.color,
              rank: tier.rank,
            },
          })
          .then((created) => {
            tierReplacementsMap.set(tier.tempId, String(created.id));
          }),
      );

      await Promise.all([...updatePromises, ...createPromises]);
    }

    // 3. Обработка книг
    if (payload.newBooks?.length) {
      // Оптимизация Bolt: параллельное создание новых книг
      await Promise.all(
        payload.newBooks.map((bookData) =>
          tx.book
            .create({
              data: {
                title: bookData.title,
                author: bookData.author ?? null,
                coverImageUrl: bookData.coverImageUrl,
                description: bookData.description ?? null,
                thoughts: bookData.thoughts ?? null,
              },
            })
            .then((created) => {
              bookReplacementsMap.set(bookData.tempId, String(created.id));
            }),
        ),
      );
    }

    // 4. Обновление позиций (Placements)
    if (payload.placements?.length) {
      // Сначала удаляем все старые позиции для этого тир-листа (атомарная перезапись)
      await tx.bookPlacement.deleteMany({
        where: { tierListId },
      });

      // Создаем новые позиции
      const placementData = payload.placements.map((p) => {
        let finalBookId: number;
        if (typeof p.bookId === "string" && p.bookId.includes("-")) {
          // Оптимизация Bolt: использование Map для поиска (O(1) вместо O(N))
          const found = bookReplacementsMap.get(p.bookId);
          if (!found)
            throw new Error(`Real ID not found for temp book ID: ${p.bookId}`);
          finalBookId = parseInt(found, 10);
        } else {
          finalBookId =
            typeof p.bookId === "string" ? parseInt(p.bookId, 10) : p.bookId;
        }

        let finalTierId: number | null = null;
        if (p.tierId !== null) {
          if (typeof p.tierId === "string" && p.tierId.includes("-")) {
            // Оптимизация Bolt: использование Map для поиска (O(1) вместо O(N))
            const found = tierReplacementsMap.get(p.tierId as string);
            if (!found)
              throw new Error(`Real ID not found for temp tier ID: ${p.tierId}`);
            finalTierId = parseInt(found, 10);
          } else {
            finalTierId =
              typeof p.tierId === "string" ? parseInt(p.tierId, 10) : p.tierId;
          }
        }

        return {
          tierListId,
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
      where: { id: tierListId },
      data: { updatedAt: new Date() },
    });

    // Преобразуем Map обратно в массив для сохранения контракта возвращаемого значения
    const tierReplacements = Array.from(tierReplacementsMap.entries()).map(
      ([tempId, realId]) => ({ tempId, realId }),
    );
    const bookReplacements = Array.from(bookReplacementsMap.entries()).map(
      ([tempId, realId]) => ({ tempId, realId }),
    );

    return {
      bookReplacements,
      tierReplacements,
    };
  });
}
