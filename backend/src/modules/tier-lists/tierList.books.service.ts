import { prisma, resolveTierListId, tierListRepository } from "./tierList.utils.js";
import { createLogger } from "../../lib/logger.js";
import { sanitize } from "../../lib/sanitizer.js";

const logger = createLogger("TierListsBooks", { color: "cyan" });

// Лимит отключён до введения подписок Pro

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

  await prisma.$transaction([
    prisma.bookPlacement.deleteMany({
      where: { tierListId: realTierListId },
    }),
    prisma.bookPlacement.createMany({
      data: placements.map((p) => ({
        tierListId: realTierListId,
        bookId: p.bookId,
        tierId: p.tierId,
        rank: p.rank,
      })),
    }),
  ]);

  const totalTime = Date.now() - startTime;
  logger.debug("updatePlacements завершено", {
    placementsCount: placements.length,
    totalTimeMs: totalTime,
  });
}

export async function addBooksToTierList(
  tierListId: string,
  books: {
    title: string;
    author?: string | null;
    coverImageUrl: string;
    description?: string | null;
    thoughts?: string | null;
    genre?: string | null;
    tags?: string[];
  }[],
) {
  if (books.length === 0) return [];

  const realTierListId = await resolveTierListId(tierListId);

  const existingBooksCount = await prisma.bookPlacement.count({
    where: { tierListId: realTierListId },
  });

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
                description: bookData.description ? sanitize(bookData.description) : null,
                thoughts: bookData.thoughts ? sanitize(bookData.thoughts) : null,
                genre: bookData.genre ? sanitize(bookData.genre) : null,
                tags: bookData.tags ?? [],
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
    genre?: string | null;
    tags?: string[];
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

  const sanitizedData: Record<string, unknown> = { ...data };
  if (sanitizedData.thoughts !== undefined) {
    sanitizedData.thoughts = sanitizedData.thoughts ? sanitize(sanitizedData.thoughts as string) : null;
  }
  if (sanitizedData.description !== undefined) {
    sanitizedData.description = sanitizedData.description ? sanitize(sanitizedData.description as string) : null;
  }
  if (sanitizedData.genre !== undefined) {
    sanitizedData.genre = sanitizedData.genre ? sanitize(sanitizedData.genre as string) : null;
  }

  if (sanitizedData.title === undefined) delete sanitizedData.title;
  if (sanitizedData.author === undefined) delete sanitizedData.author;
  if (sanitizedData.tags === undefined) delete sanitizedData.tags;

  return prisma.book.update({
    where: { id: bookId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: sanitizedData as any,
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
