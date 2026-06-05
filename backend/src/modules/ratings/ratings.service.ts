import { prisma } from "../../lib/prisma.js";

export const RATING_CATEGORIES = ["style", "plot", "design", "atmosphere", "characters"] as const;

export type RatingCategory = typeof RATING_CATEGORIES[number];

export const CATEGORY_LABELS: Record<RatingCategory, string> = {
  style: "Слог автора",
  plot: "Сюжет",
  design: "Дизайн книги",
  atmosphere: "Атмосфера",
  characters: "Персонажи",
};

export async function rateBook(
  bookId: number,
  userId: number,
  ratings: Record<string, number>,
) {
  // upsert — создать или обновить существующую оценку
  return prisma.bookRating.upsert({
    where: { bookId_userId: { bookId, userId } },
    create: {
      bookId,
      userId,
      ratings: ratings as Record<string, number>,
    },
    update: {
      ratings: ratings as Record<string, number>,
    },
  });
}

export async function getBookRatings(bookId: number) {
  const ratings = await prisma.bookRating.findMany({
    where: { bookId },
    select: { ratings: true },
  });

  if (ratings.length === 0) return null;

  const totals: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const r of ratings) {
    const entry = r.ratings as Record<string, number>;
    for (const [category, value] of Object.entries(entry)) {
      totals[category] = (totals[category] || 0) + value;
      counts[category] = (counts[category] || 0) + 1;
    }
  }

  const averages: Record<string, number> = {};
  for (const category of Object.keys(totals)) {
    averages[category] = Math.round(((totals[category] as number) / (counts[category] as number)) * 10) / 10;
  }

  const allValues = Object.values(averages);
  const overall =
    allValues.length > 0
      ? Math.round((allValues.reduce((a, b) => a + b, 0) / allValues.length) * 10) / 10
      : 0;

  return {
    count: ratings.length,
    averages,
    overall,
  };
}

export async function getUserBookRating(bookId: number, userId: number) {
  return prisma.bookRating.findUnique({
    where: { bookId_userId: { bookId, userId } },
  });
}
