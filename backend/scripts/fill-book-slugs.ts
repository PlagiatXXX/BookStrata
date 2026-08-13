/**
 * Заполнение slug у книг без slug (Фаза 1.4, seobook.md).
 *
 * Вариант А (решение из Фазы 0): чистый slug — slugify(title + "-" + author),
 * уникальность через retry-цикл (-2, -3, ...). Индекс creates slug красивый URL
 * для SEO-каталога; при конкурентном создании гонка ловится P2002 в рантайме
 * (см. матчинг Фазы 2.1).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(text: string): string {
  const cyrillicToLatin: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
    ж: "zh", з: "z", и: "i", й: "j", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };

  return text
    .toLowerCase()
    .trim()
    .split("")
    .map((char) => cyrillicToLatin[char] || char)
    .join("")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function generateUniqueSlug(book: {
  title: string;
  author: string | null;
}): Promise<string> {
  const base = slugify([book.title, book.author].filter(Boolean).join("-"));
  const candidate = (n: number) => (n === 1 ? base : `${base}-${n}`);

  let attempt = 1;
  while (attempt <= 10) {
    const slug = candidate(attempt);
    const existing = await prisma.book.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
    attempt++;
  }
  // Если 10 попыток не хватило — добавляем случайный суффикс (крайний случай)
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

async function main() {
  const books = await prisma.book.findMany({
    where: { slug: null },
    select: { id: true, title: true, author: true },
    orderBy: { id: "asc" },
  });

  console.log(`Книг без slug: ${books.length}`);

  for (const book of books) {
    const slug = await generateUniqueSlug(book);
    await prisma.book.update({
      where: { id: book.id },
      data: { slug },
    });
    console.log(`  ✓ #${book.id} ${book.title} → /books/${slug}`);
  }

  console.log("Готово!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());