import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";
import { Prisma } from "@prisma/client";

const logger = createLogger("CatalogSearch", { color: "cyan" });

export interface CatalogBook {
  id: number;
  title: string;
  author: string | null;
  slug: string | null;
  coverImageUrl: string;
  rating: number | null;
}

/**
 * Публичный поиск по каталогу книг.
 * Поиск по title/author с нормализацией ё→е.
 *
 * Сортировка по релевантности (строго по порядку букв с начала строки):
 * 0 — точное совпадение названия
 * 1 — название начинается с запроса (подстрока)
 * 2 — название содержит запрос (подстрока)
 * 3 — автор начинается с запроса (подстрока)
 * 4 — автор содержит запрос (подстрока)
 * 5 — буквы запроса идут в порядке написания с начала названия (regex ^d.*k)
 * 6 — буквы запроса идут в порядке написания с начала автора
 */
export async function searchCatalogBooks(
  query: string,
  limit = 10,
): Promise<CatalogBook[]> {
  const q = query.trim().toLowerCase().replace(/ё/g, "е");
  const safeLimit = Math.min(Math.max(limit, 1), 20);

  if (!q || q.length < 2) return [];

  // Построение regex-паттерна: каждая буква через .*
  // "дк" → "д.*к", "гарри" → "г.*а.*р.*р.*и"
  // Якорь ^ — буквы должны идти строго с начала названия/автора
  const seqPattern = `^${q.split("").map((c) => escapeRegex(c)).join(".*")}`;

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: number;
        title: string;
        author: string | null;
        slug: string | null;
        cover_image_url: string;
        rating: number | null;
      }>
    >(Prisma.sql`
      SELECT b.id, b.title, b.author, b.slug, b.cover_image_url, b.rating
      FROM "Book" b
      WHERE b.status = 'published'
        AND (
          lower(replace(b.title, 'ё', 'е')) LIKE ${`%${q}%`}
          OR lower(replace(coalesce(b.author, ''), 'ё', 'е')) LIKE ${`%${q}%`}
          OR lower(replace(b.title, 'ё', 'е')) ~ ${seqPattern}
          OR lower(replace(coalesce(b.author, ''), 'ё', 'е')) ~ ${seqPattern}
        )
      ORDER BY CASE
          WHEN lower(replace(b.title, 'ё', 'е')) = ${q} THEN 0
          WHEN lower(replace(b.title, 'ё', 'е')) LIKE ${`${q}%`} THEN 1
          WHEN lower(replace(b.title, 'ё', 'е')) LIKE ${`%${q}%`} THEN 2
          WHEN lower(replace(coalesce(b.author, ''), 'ё', 'е')) LIKE ${`${q}%`} THEN 3
          WHEN lower(replace(coalesce(b.author, ''), 'ё', 'е')) LIKE ${`%${q}%`} THEN 4
          WHEN lower(replace(b.title, 'ё', 'е')) ~ ${seqPattern} THEN 5
          WHEN lower(replace(coalesce(b.author, ''), 'ё', 'е')) ~ ${seqPattern} THEN 6
          ELSE 7
        END, b.title ASC
      LIMIT ${safeLimit}
    `);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      author: r.author,
      slug: r.slug,
      coverImageUrl: r.cover_image_url,
      rating: r.rating,
    }));
  } catch (error) {
    logger.error(error as Error, { query, limit: safeLimit });
    return [];
  }
}

/** Экранирование спецсимволов regex */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
