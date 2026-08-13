// backend/src/modules/books/bookSnapshots.service.ts
//
// Обогащение JSON-снимков книг (Collections.books / Celebrity.books) ссылками
// на страницы каталога. Снимок — редакторская карточка (название, автор,
// обложка), каталог — нормализованная запись Book со slug.
//
// Матчинг — консервативный, по нормализованным (title, author): снимки
// создавались из тех же карточек, что и каталог (Фаза 1.5), поэтому точное
// совпадение надёжно. Кладём в снимок slug + status: "published" — фронт
// делает карточку ссылкой на /books/{slug} только для опубликованных книг.
import { prisma } from "../../lib/prisma.js";

export type BookSnapshot = Record<string, unknown> & { title?: unknown; author?: unknown };

/** Нормализация для сравнения: регистр, ё→е, схлопывание пробелов. */
export function normalizeSnapshotText(value: string): string {
  return value.toLowerCase().trim().replace(/ё/g, "е").replace(/\s+/g, " ");
}

/**
 * Добавляет slug опубликованных каталоговых книг в снимки.
 * Возвращает новый объект (исходный не мутируется). Не найдено → снимок без изменений.
 * Принимает JsonValue (Books из Prisma) — не-объектные значения возвращает как есть.
 */
export async function enrichBookSnapshots(
  books: unknown,
): Promise<unknown> {
  if (!books || typeof books !== "object" || Array.isArray(books)) {
    return books;
  }

  const entries = Object.entries(books).filter(
    ([, snap]) => snap && typeof snap === "object" && typeof snap.title === "string",
  );
  if (entries.length === 0) return books;

  // Один запрос на все опубликованные книги каталога (их мало — единицы/десятки)
  const catalog = await prisma.book.findMany({
    where: { status: "published", slug: { not: null } },
    select: { title: true, author: true, slug: true },
  });

  const slugByKey = new Map<string, string>();
  for (const b of catalog) {
    if (!b.slug) continue;
    const author = b.author ? normalizeSnapshotText(b.author) : "";
    slugByKey.set(`${normalizeSnapshotText(b.title)}|${author}`, b.slug);
  }

  let enriched = false;
  const result: Record<string, BookSnapshot> = {};
  for (const [key, snap] of entries) {
    const title = normalizeSnapshotText(String(snap.title));
    const author = typeof snap.author === "string" ? normalizeSnapshotText(snap.author) : "";
    const slug = slugByKey.get(`${title}|${author}`);
    if (slug) {
      result[key] = { ...snap, slug, status: "published" };
      enriched = true;
    } else {
      result[key] = snap;
    }
  }

  return enriched ? result : books;
}
