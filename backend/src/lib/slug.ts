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

/**
 * Создание книги с уникальным slug: retry-цикл с суффиксами (-2, -3, …).
 * Если slug-суффиксы исчерпаны — случайный суффикс (крайний случай).
 * Конкурентная гонка по partial unique index / unique(source, externalId)
 * ловится на уровне P2002 и обрабатывается в addBooksToTierList (retry → link).
 */
export async function createBookWithSlug(
  tx: Prisma.TransactionClient,
  data: Prisma.BookUncheckedCreateInput,
  base?: string,
): Promise<{ id: number }> {
  const slugBase = base ?? slugify([data.title, data.author].filter(Boolean).join("-"));
  const candidate = (n: number) => (n === 1 ? slugBase : `${slugBase}-${n}`);

  for (let attempt = 1; attempt <= 10; attempt++) {
    const slug = candidate(attempt);
    try {
      return await tx.book.create({ data: { ...data, slug } });
    } catch (error) {
      if (isPrismaP2002(error)) {
        // Конфликт именно по slug → занят существующей книгой/гонкой → следующий суффикс.
        // Конфликт по unique (source, externalId) / partial unique index — не про slug:
        // пробрасываем наверх, там linkOrCreate перезапрашивает канон (P2002 → retry → link).
        const target = (error as { meta?: { target?: unknown } }).meta?.target;
        const isSlugConflict = Array.isArray(target)
          ? target.includes("slug")
          : String(target ?? "").includes("slug");
        if (isSlugConflict) continue;
        throw error;
      }
      throw error;
    }
  }
  return tx.book.create({
    data: { ...data, slug: `${slugBase}-${Math.random().toString(36).slice(2, 7)}` },
  });
}