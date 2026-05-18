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

const getTierListWhereClause = (tierListId: string) =>
  isUuid(tierListId) || /^\d+$/.test(tierListId) ? { id: tierListId } : { slug: tierListId };

// Получение списка тир-листов пользователя (краткая информация)
export async function getUserTierLists(
  userId: number,
  query: GetTierListsQuery,
) {
  const page = parseInt(query.page, 10);
  const pageSize = parseInt(query.pageSize, 10);
  const skip = (page - 1) * pageSize;

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
        slug: true,
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

  const data = tierLists.map((tl) => ({
    ...tl,
    booksCount: tl._count?.placements ?? 0,
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
    select: { id: true, userId: true },
  });

  if (!list || list.userId !== userId) {
    const error = new Error("Forbidden");
    (error as any).statusCode = 403;
    throw error;
  }
  return list.id;
}

// Получение полного тир-листа
export async function getFullTierList(id: string, currentUserId?: number) {
  const whereClause = getTierListWhereClause(id);

  const tierList = await prisma.tierList.findUniqueOrThrow({
    where: whereClause,
    include: {
      tiers: {
        orderBy: { rank: "asc" },
        include: {
          items: {
            orderBy: { rank: "asc" },
            include: { book: true },
          },
        },
      },
      placements: {
        where: { tierId: null },
        orderBy: { rank: "asc" },
        include: { book: true },
      },
      user: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });

  const { placements: unrankedBooks, ...rest } = tierList;
  return { ...rest, unrankedBooks };
}

// Обновление позиций
export async function updatePlacements(
  tierListId: string,
  placements: { bookId: number; tierId: number | null; rank: number }[],
) {
  if (placements.length === 0) return [];

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
        tierListId,
      },
    });

    if (tierCount !== tierIds.length) {
      throw new Error("One or more tiers do not belong to this tier list");
    }
  }

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

  return prisma.$transaction(transactions);
}

// Добавление книг в тир-лист
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

  const existingBooksCount = await prisma.bookPlacement.count({
    where: { tierListId },
  });

  if (existingBooksCount + books.length > MAX_BOOKS_PER_TIER_LIST) {
    throw new Error(
      `Превышен лимит книг в тир-листе. Максимум: ${MAX_BOOKS_PER_TIER_LIST}, текущее количество: ${existingBooksCount}, добавляется: ${books.length}`,
    );
  }

  return prisma.$transaction(async (tx) => {
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
          where: { rank: { gte: existingBooksCount } },
          include: { book: true },
        },
      },
    });

    return updatedTierList.placements;
  });
}

// Удаление книги из тир-листа
export async function removeBookFromTierList(
  tierListId: string,
  bookId: number,
) {
  try {
    await prisma.bookPlacement.delete({
      where: { tierListId_bookId: { tierListId, bookId } },
    });
  } catch (e) {
    // Игнорируем ошибку если запись не найдена
  }

  await prisma.book
    .delete({ where: { id: bookId } })
    .catch(() => {
      logger.debug("Book delete skipped (maybe already deleted or in use)", { bookId });
    });
}

// Обновление метаданных тир-листа
export async function updateTierList(
  id: string,
  data: { title?: string; isPublic?: boolean; year?: number },
) {
  return prisma.tierList.update({
    where: { id },
    data,
  });
}

// Сохранение тиров
export async function saveTiers(
  tierListId: string,
  payload: {
    added?: Array<{ title: string; color: string; rank: number }>;
    updated?: Array<{ id: number; title: string; color: string; rank: number }>;
    deletedIds?: number[];
  },
) {
  return prisma.$transaction(async (tx) => {
    if (payload.deletedIds?.length) {
      await tx.tier.deleteMany({
        where: { id: { in: payload.deletedIds }, tierListId },
      });
    }

    if (payload.updated?.length) {
      for (const t of payload.updated) {
        await tx.tier.updateMany({
          where: { id: t.id, tierListId },
          data: { title: t.title, color: t.color, rank: t.rank },
        });
      }
    }

    if (payload.added?.length) {
       await tx.tier.createMany({
         data: payload.added.map(t => ({ ...t, tierListId }))
       });
    }

    const tiers = await tx.tier.findMany({
      where: { tierListId },
      orderBy: { rank: "asc" }
    });

    return tiers;
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
    const tierReplacements: { tempId: string; realId: string }[] = [];
    const bookReplacements: { tempId: string; realId: string }[] = [];

    // 2. Обработка тиров
    if (payload.tiers) {
      if (payload.tiers.deletedIds?.length) {
        await tx.tier.deleteMany({
          where: { id: { in: payload.deletedIds }, tierListId },
        });
      }
      if (payload.tiers.updated?.length) {
        for (const tier of payload.tiers.updated) {
          await tx.tier.updateMany({
            where: { id: tier.id, tierListId },
            data: { title: tier.title, color: tier.color, rank: tier.rank },
          });
        }
      }
      if (payload.tiers.added?.length) {
        for (const tier of payload.tiers.added) {
          const created = await tx.tier.create({
            data: {
              tierListId,
              title: tier.title,
              color: tier.color,
              rank: tier.rank,
            },
          });
          tierReplacements.push({
            tempId: tier.tempId,
            realId: String(created.id),
          });
        }
      }
    }

    // 3. Обработка книг
    if (payload.newBooks?.length) {
      for (const bookData of payload.newBooks) {
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

    // 4. Обновление позиций
    if (payload.placements?.length) {
      const bookReplacementMap = new Map(
        bookReplacements.map((r) => [r.tempId, r.realId]),
      );
      const tierReplacementMap = new Map(
        tierReplacements.map((r) => [r.tempId, r.realId]),
      );

      const existingBookIds = Array.from(
        new Set(
          payload.placements
            .filter(
              (p) => typeof p.bookId !== "string" || !p.bookId.includes("-"),
            )
            .map((p) =>
              typeof p.bookId === "string" ? parseInt(p.bookId, 10) : (p.bookId as number),
            ),
        ),
      );

      if (existingBookIds.length > 0) {
        const count = await tx.bookPlacement.count({
          where: {
            tierListId,
            bookId: { in: existingBookIds },
          },
        });

        if (count !== existingBookIds.length) {
          // Проверяем глобально
          const globalCount = await tx.book.count({
            where: { id: { in: existingBookIds } }
          });
          if (globalCount !== existingBookIds.length) {
             throw new Error("One or more books do not belong to this tier list");
          }
        }
      }

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
          where: { id: { in: existingTierIds }, tierListId },
        });

        if (tierCount !== existingTierIds.length) {
          throw new Error("One or more tiers do not belong to this tier list");
        }
      }

      await tx.bookPlacement.deleteMany({
        where: { tierListId },
      });

      const placementData = payload.placements.map((p) => {
        let finalBookId: number;
        if (typeof p.bookId === "string" && p.bookId.includes("-")) {
          const realId = bookReplacementMap.get(p.bookId);
          if (!realId) throw new Error(`Real ID not found for temp book ID: ${p.bookId}`);
          finalBookId = parseInt(realId, 10);
        } else {
          finalBookId = typeof p.bookId === "string" ? parseInt(p.bookId, 10) : (p.bookId as number);
        }

        let finalTierId: number | null = null;
        if (p.tierId !== null) {
          if (typeof p.tierId === "string" && p.tierId.includes("-")) {
            const realId = tierReplacementMap.get(p.tierId);
            if (!realId) throw new Error(`Real ID not found for temp tier ID: ${p.tierId}`);
            finalTierId = parseInt(realId, 10);
          } else {
            finalTierId = typeof p.tierId === "string" ? parseInt(p.tierId, 10) : (p.tierId as number);
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

    await tx.tierList.update({
      where: { id: tierListId },
      data: { updatedAt: new Date() },
    });

    return {
      bookReplacements,
      tierReplacements,
    };
  });
}

export async function getTierListBooksCount(tierListId: string) {
  return prisma.bookPlacement.count({ where: { tierListId } });
}

export async function updateBook(
  tierListId: string,
  bookId: number,
  data: { title?: string; author?: string | null; description?: string | null; thoughts?: string | null }
) {
  await prisma.bookPlacement.findUniqueOrThrow({
    where: { tierListId_bookId: { tierListId, bookId } }
  });

  return prisma.book.update({
    where: { id: bookId },
    data
  });
}

export async function updateBookCover(tierListId: string, bookId: number, coverImageUrl: string) {
  await prisma.bookPlacement.findUniqueOrThrow({
    where: { tierListId_bookId: { tierListId, bookId } }
  });

  return prisma.book.update({
    where: { id: bookId },
    data: { coverImageUrl }
  });
}

export async function togglePublic(tierListId: string, isPublic: boolean) {
  return prisma.tierList.update({
    where: { id: tierListId },
    data: { isPublic },
    select: { id: true, isPublic: true }
  });
}

export async function getLikedTierLists(userId: number) {
  return prisma.tierList.findMany({
    where: { likes: { some: { userId } } },
    select: { id: true, title: true }
  });
}

export async function deleteTierList(id: string) {
  return prisma.tierList.delete({ where: { id } });
}

export async function getPublicTierLists(query: any) {
  const page = parseInt(query.page || "1", 10);
  const pageSize = parseInt(query.pageSize || "10", 10);
  const skip = (page - 1) * pageSize;

  const [data, totalItems] = await Promise.all([
    prisma.tierList.findMany({
      where: { isPublic: true },
      include: {
        user: { select: { username: true, avatarUrl: true } },
        _count: { select: { placements: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: pageSize,
      skip
    }),
    prisma.tierList.count({ where: { isPublic: true } })
  ]);

  return {
    data,
    meta: {
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      currentPage: page
    }
  };
}

export async function forkTierList(id: string, userId: number) {
  const original = await prisma.tierList.findUniqueOrThrow({
    where: getTierListWhereClause(id),
    include: {
      tiers: { orderBy: { rank: "asc" } },
      placements: { include: { book: true }, orderBy: { rank: "asc" } }
    }
  });

  return prisma.$transaction(async (tx) => {
    const newList = await tx.tierList.create({
      data: {
        userId,
        title: `${original.title} (копия)`,
        isPublic: false,
        tiers: {
          create: original.tiers.map(t => ({ title: t.title, color: t.color, rank: t.rank }))
        }
      },
      include: {
        tiers: { orderBy: { rank: "asc" } }
      }
    });

    const tierMap = new Map();
    original.tiers.forEach((ot, i) => {
       if (newList.tiers && newList.tiers[i]) {
         tierMap.set(ot.id, newList.tiers[i].id);
       }
    });

    const placementCreates = original.placements.map(p => {
      const mappedTierId = p.tierId ? tierMap.get(p.tierId) : null;
      if (p.tierId && !mappedTierId) {
         throw new Error(`Mapped tier ID not found for source tier ID: ${p.tierId}`);
      }
      return {
        rank: p.rank,
        ...(mappedTierId ? { tier: { connect: { id: mappedTierId } } } : {}),
        book: {
          create: {
            title: p.book.title,
            author: p.book.author,
            coverImageUrl: p.book.coverImageUrl,
            description: p.book.description,
            thoughts: p.book.thoughts
          }
        }
      };
    });

    await tx.tierList.update({
      where: { id: newList.id },
      data: {
        placements: {
          create: placementCreates
        }
      }
    });

    return newList;
  });
}
