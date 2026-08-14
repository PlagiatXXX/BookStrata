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

export async function getBookRatings(bookId: number, adminRating?: number | null) {
  const ratings = await prisma.bookRating.findMany({
    where: { bookId },
    select: { ratings: true },
  });

  if (ratings.length === 0 && (adminRating === null || adminRating === undefined)) return null;

  // Пользовательские голоса — записи с ключом "overall" (одна оценка 0–10).
  // Редакторские — по категориям (style/plot/...) из админ-модалки.
  const userRatings = ratings.filter((r) => "overall" in (r.ratings as Record<string, number>));

  const totals: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const r of ratings) {
    const entry = r.ratings as Record<string, number>;
    for (const [category, value] of Object.entries(entry)) {
      if (category === "overall") continue; // пользовательские усредняем отдельно
      totals[category] = (totals[category] || 0) + value;
      counts[category] = (counts[category] || 0) + 1;
    }
  }

  const averages: Record<string, number> = {};
  for (const category of Object.keys(totals)) {
    averages[category] = Math.round(((totals[category] as number) / (counts[category] as number)) * 10) / 10;
  }

  let overall: number;
  let count: number;

  if (userRatings.length > 0) {
    const sum = userRatings.reduce(
      (acc, r) => acc + ((r.ratings as Record<string, number>).overall ?? 0),
      0,
    );
    // Оценка редакции — начальная точка отправления: усредняется с голосами пользователей
    const hasAdmin = adminRating !== null && adminRating !== undefined;
    overall =
      hasAdmin && userRatings.length > 0
        ? Math.round(((adminRating! + sum) / (userRatings.length + 1)) * 10) / 10
        : Math.round((sum / userRatings.length) * 10) / 10;
    count = userRatings.length;
  } else if (adminRating !== null && adminRating !== undefined) {
    // Голосов ещё нет — показываем оценку редакции как начальную точку
    overall = adminRating;
    count = 0;
  } else {
    // Пользовательских голосов нет — fallback: среднее редакторских категорий
    const allValues = Object.values(averages);
    overall =
      allValues.length > 0
        ? Math.round((allValues.reduce((a, b) => a + b, 0) / allValues.length) * 10) / 10
        : 0;
    count = ratings.length;
  }

  return {
    count,
    averages,
    overall,
  };
}

export async function getUserBookRating(bookId: number, userId: number) {
  return prisma.bookRating.findUnique({
    where: { bookId_userId: { bookId, userId } },
  });
}
