// backend/src/lib/slug.ts
// Транслитерация и генерация уникальных slug для книг (Фаза 2.1, seobook.md).
// Логика перенесена из scripts/fill-book-slugs.ts (Вариант А): slugify(title-author),
// уникальность через retry-цикл -2, -3, ...; конкурентную гонку ловит P2002 в рантайме.
import type { Prisma } from "@prisma/client";

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
  ж: "zh", з: "z", и: "i", й: "j", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "shch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] || char)
    .join("")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function isPrismaP2002(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

export interface CreateBookWithSlugOptions {
  /**
   * Каталог всегда получает ЧИСТЫЙ slug (решение 18.08): если чистый slug
   * занят draft-книгой (личной из тир-листа или черновиком) — переименовываем
   * её (slug = null), каталог забирает URL. published не трогаем — суффикс.
   */
  reclaimFromDraft?: boolean;
}

/**
 * Создание книги с уникальным slug: retry-цикл с суффиксами (-2, -3, …).
 * Если slug-суффиксы исчерпаны — случайный суффикс (крайний случай).
 * Конкурентная гонка по partial unique index / unique(userId, source, externalId)
 * ловится на уровне P2002 и обрабатывается в addBooksToTierList (retry → link).
 */
export async function createBookWithSlug(
  tx: Prisma.TransactionClient,
  data: Prisma.BookUncheckedCreateInput,
  base?: string,
  options?: CreateBookWithSlugOptions,
): Promise<{ id: number }> {
  const slugBase = base ?? slugify([data.title, data.author].filter(Boolean).join("-"));
  const candidate = (n: number) => (n === 1 ? slugBase : `${slugBase}-${n}`);

  // Занятость slug проверяем ДО create: P2002 abort'ит interactive-транзакцию
  // Prisma 4 (все последующие запросы падают с E25P02 «transaction is aborted»),
  // поэтому конфликт по slug нельзя обработать после create — только до.
  // Исключение — конкурентная гонка (P2002 всё же возможен между findUnique и
  // create): его пробрасываем наверх, там транзакция перезапускается целиком.
  for (let attempt = 1; attempt <= 10; attempt++) {
    const slug = candidate(attempt);

    const occupant = await tx.book.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (occupant) {
      // Каталог забирает чистый slug у draft-книги (страниц у draft нет);
      // published не трогаем — переходим к следующему суффиксу.
      if (options?.reclaimFromDraft && attempt === 1 && occupant.status === "draft") {
        await tx.book.update({
          where: { id: occupant.id },
          data: { slug: null },
        });
        try {
          return await tx.book.create({ data: { ...data, slug } });
        } catch (error) {
          // Гонка на том же slug (другой запрос переименовал/создал) —
          // транзакция aborted, обработка только наверху (retry целиком).
          if (isPrismaP2002(error)) throw error;
          throw error;
        }
      }
      continue;
    }

    try {
      return await tx.book.create({ data: { ...data, slug } });
    } catch (error) {
      if (isPrismaP2002(error)) {
        // Гонка (slug/unique) → транзакция aborted, продолжить нельзя —
        // пробрасываем наверх: там retry транзакции целиком.
        throw error;
      }
      throw error;
    }
  }
  return tx.book.create({
    data: { ...data, slug: `${slugBase}-${Math.random().toString(36).slice(2, 7)}` },
  });
}