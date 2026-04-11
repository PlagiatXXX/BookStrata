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

  // Оптимизация Bolt: используем единый вложенный update для сокращения roundtrip-ов.
  // Это сокращает количество последовательных запросов с O(N) до O(1).
  // Ожидаемый эффект: сокращение времени выполнения addBooksToTierList на ~50% для пакета из 10+ книг.
  const updatedTierList = await prisma.tierList.update({
    where: { id: tierListId },
    data: {
      placements: {
        create: books.map((bookData, index) => ({
          rank: existingBooksCount + index,
          tierId: null,
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
          book: {
            // Фильтруем только что добавленные книги по совпадению данных (упрощенно для возврата)
            // Но лучше вернуть все книги и отфильтровать в памяти по ID, если Prisma позволяет.
            // В данном случае, так как мы добавили новые, мы можем просто вернуть последние добавленные.
            createdAt: { gte: new Date(Date.now() - 1000) },
          },
        },
        include: { book: true },
        orderBy: { rank: "asc" },
      },
    },
  });

  // Возвращаем только новые добавленные книги
  return updatedTierList.placements
    .slice(-books.length)
    .map((placement) => ({ book: placement.book }));
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

    // 4. Копируем книги и создаем размещения за один запрос
    // Оптимизация Bolt: используем единый вложенный update для сокращения roundtrip-ов.
    // Это сокращает количество последовательных запросов с O(N) до O(1), где N - количество книг.
    // Ожидаемый эффект: сокращение времени выполнения forkTierList на ~40-60% при N=10-20.
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
