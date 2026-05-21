import { prisma, resolveTierListId, tierListRepository } from "./tierList.utils.js";
import { createLogger } from "../../lib/logger.js";

const logger = createLogger("TierListsBooks", { color: "cyan" });

const MAX_BOOKS_PER_TIER_LIST = 20;

export async function updatePlacements(
  tierListId: string,
  placements: { bookId: number; tierId: number | null; rank: number }[],
) {
  const startTime = Date.now();

  if (placements.length === 0) return [];

  const realTierListId = await resolveTierListId(tierListId);

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
  if (books.length === 0) return [];

  const realTierListId = await resolveTierListId(tierListId);

  const existingBooksCount = await prisma.bookPlacement.count({
    where: { tierListId: realTierListId },
  });

  if (existingBooksCount + books.length > MAX_BOOKS_PER_TIER_LIST) {
    throw new Error(
      `Превышен лимит книг в тир-листе. Максимум: ${MAX_BOOKS_PER_TIER_LIST}, текущее количество: ${existingBooksCount}, добавляется: ${books.length}`,
    );
  }

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
  const tierList = await tierListRepository.findById(tierListId, {
    select: { id: true },
  });

  if (!tierList) {
    throw Object.assign(new Error("Tier list not found"), { statusCode: 404 });
  }

  const bookPlacement = await prisma.bookPlacement.findUnique({
    where: { tierListId_bookId: { tierListId: tierList.id, bookId } },
  });

  if (!bookPlacement) {
    throw Object.assign(new Error("Book does not belong to this tier list"), { statusCode: 404 });
  }

  return prisma.book.update({
    where: { id: bookId },
    data,
  });
}

export async function updateBookCover(
  tierListId: string,
  bookId: number,
  coverImageUrl: string,
) {
  const tierList = await tierListRepository.findById(tierListId, {
    select: { id: true },
  });

  if (!tierList) {
    throw Object.assign(new Error("Tier list not found"), { statusCode: 404 });
  }

  const bookPlacement = await prisma.bookPlacement.findUnique({
    where: { tierListId_bookId: { tierListId: tierList.id, bookId } },
  });

  if (!bookPlacement) {
    throw Object.assign(new Error("Book does not belong to this tier list"), { statusCode: 404 });
  }

  return prisma.book.update({
    where: { id: bookId },
    data: { coverImageUrl },
  });
}

export async function removeBookFromTierList(
  tierListId: string,
  bookId: number,
) {
  const tierList = await tierListRepository.findById(tierListId, {
    select: { id: true },
  });

  if (!tierList) return;

  await prisma.bookPlacement.deleteMany({
    where: { tierListId: tierList.id, bookId },
  });

  await prisma.book
    .delete({
      where: { id: bookId },
    })
    .catch(() => {
      logger.debug("Book delete skipped (maybe already deleted or in use)", {
        bookId,
      });
    });
}
