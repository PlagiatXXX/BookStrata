import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

const BOOK_SELECT = {
  id: true,
  slug: true,
  title: true,
  author: true,
  coverImageUrl: true,
} as const;

/**
 * Получить трендовые книги:
 *  1. Сначала — книги с isTrending: true (ручная опция админа)
 *  2. Потом — добираем до limit по уникальным просмотрам за все время
 *
 * Уникальные просмотры = COUNT(DISTINCT COALESCE(userId::text, ip))
 * для событий page_view с url, содержащим /books/.
 */
export async function getTrendingBooks(limit = 8) {
  // 1. Ручные книги (isTrending: true)
  const manualBooks = await prisma.book.findMany({
    where: {
      status: "published",
      isTrending: true,
      coverImageUrl: { not: "" },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: BOOK_SELECT,
  });

  const remaining = limit - manualBooks.length;
  if (remaining <= 0) return manualBooks.slice(0, limit);

  // 2. Книги по уникальным просмотрам (исключая уже выбранные)
  const manualIds = manualBooks.map((b) => b.id);

  // Подсчёт уникальных просмотров по slug
  const viewRows = await prisma.$queryRaw<
    Array<{ slug: string; unique_views: bigint }>
  >`
    SELECT
      b.slug,
      COUNT(DISTINCT COALESCE(ae."userId"::text, ae.ip)) AS unique_views
    FROM "AnalyticsEvent" ae
    JOIN "Book" b ON position('/books/' || b.slug IN ae.url) > 0
                    OR position('/books/' || b.slug || '/' IN ae.url) > 0
                    OR ae.url = '/books/' || b.slug
                    OR ae.url = 'https://bookstrata.ru/books/' || b.slug
    WHERE ae.event = 'page_view'
      ${manualIds.length > 0 ? Prisma.sql`AND b.id NOT IN (${Prisma.join(manualIds)})` : Prisma.empty}
      AND b.status = 'published'
      AND b.cover_image_url != ''
    GROUP BY b.slug
    ORDER BY unique_views DESC
    LIMIT ${remaining}
  `;

  if (viewRows.length === 0) return manualBooks;

  // Загружаем полные данные книг по slug
  const slugs = viewRows.map((r) => r.slug);
  const booksBySlug = new Map(
    (
      await prisma.book.findMany({
        where: { slug: { in: slugs } },
        select: BOOK_SELECT,
      })
    ).map((b) => [b.slug, b]),
  );

  // Сохраняем порядок из SQL (по убыванию просмотров)
  const viewBooks = viewRows
    .map((r) => booksBySlug.get(r.slug))
    .filter((b): b is NonNullable<typeof b> => b !== undefined);

  return [...manualBooks, ...viewBooks];
}
