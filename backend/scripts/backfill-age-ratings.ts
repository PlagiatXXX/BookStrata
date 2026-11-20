/**
 * Скрипт автоматической разметки возрастного ценза (ageRating) для книг.
 * Анализирует жанры, теги и Google Books API (maturityRating: "MATURE").
 *
 * Запуск:
 *   cd backend && npx tsx scripts/backfill-age-ratings.ts
 * Опции:
 *   --dry-run (только вывод в консоль, без записи в БД)
 *   --limit=100 (ограничение количества обрабатываемых книг)
 *   --all (обрабатывать даже книги, у которых уже стоит ageRating)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADULT_KEYWORDS = [
  "эротика",
  "erotica",
  "эротический роман",
  "dark romance",
  "дарк романс",
  "дарк-романс",
  "сплаттерпанк",
  "splatterpunk",
  "боди-хоррор",
  "body horror",
  "18+",
  "для взрослых",
  "adult fiction",
  "хентай",
  "hentai",
];

const CHILD_KEYWORDS = [
  "детская литература",
  "для детей",
  "сказки",
  "для малышей",
  "детские стихи",
  "детские рассказы",
  "младший школьный возраст",
];

const YA_KEYWORDS = [
  "young adult",
  "подростковая литература",
  "для подростков",
  "ya фэнтези",
];

function detectAgeRatingFromMetadata(genre: string | null, tags: string[], description: string | null): string | null {
  const haystack = [genre ?? "", ...tags, description ?? ""].join(" ").toLowerCase();

  for (const kw of ADULT_KEYWORDS) {
    if (haystack.includes(kw)) {
      return "18+";
    }
  }

  for (const kw of CHILD_KEYWORDS) {
    if (haystack.includes(kw)) {
      return "0+";
    }
  }

  for (const kw of YA_KEYWORDS) {
    if (haystack.includes(kw)) {
      return "12+";
    }
  }

  return null;
}

async function checkGoogleBooksMaturity(volumeId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${volumeId}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { volumeInfo?: { maturityRating?: string } };
    if (json.volumeInfo?.maturityRating === "MATURE") {
      return "18+";
    }
  } catch {
    // Сетевая ошибка — пропускаем
  }
  return null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const processAll = process.argv.includes("--all");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  console.log(`Запуск разметки ageRating... [dryRun=${dryRun}, all=${processAll}, limit=${limit}]`);

  const books = await prisma.book.findMany({
    where: processAll ? {} : { ageRating: null },
    select: {
      id: true,
      title: true,
      author: true,
      genre: true,
      tags: true,
      description: true,
      externalId: true,
      source: true,
      ageRating: true,
    },
    take: Number.isFinite(limit) ? limit : undefined,
  });

  console.log(`Найдено книг для анализа: ${books.length}`);

  let updatedCount = 0;
  let adultCount = 0;
  let skippedCount = 0;

  for (const book of books) {
    let rating = detectAgeRatingFromMetadata(book.genre, book.tags, book.description);

    // Если метаданные не дали 18+, но есть Google Books ID — проверяем API
    if (!rating && book.source === "google_books" && book.externalId) {
      const gRating = await checkGoogleBooksMaturity(book.externalId);
      if (gRating) {
        rating = gRating;
      }
    }

    if (!rating) {
      skippedCount++;
      continue;
    }

    if (rating === "18+") {
      adultCount++;
    }

    updatedCount++;
    console.log(`[${rating}] #${book.id}: «${book.title}» (${book.author ?? "нет автора"})`);

    if (!dryRun) {
      await prisma.book.update({
        where: { id: book.id },
        data: { ageRating: rating },
      });
    }
  }

  console.log("\nИтоги разметки:");
  console.log(`Всего размечено: ${updatedCount} (из них 18+: ${adultCount})`);
  console.log(`Пропущено (без явных признаков): ${skippedCount}`);
  if (dryRun) {
    console.log("(Запуск был в режиме --dry-run, изменения в БД не записаны)");
  }
}

main()
  .catch((e) => {
    console.error("Ошибка при разметке:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
