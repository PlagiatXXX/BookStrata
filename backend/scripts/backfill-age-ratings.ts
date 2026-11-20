/**
 * Скрипт автоматической разметки возрастного ценза (ageRating) для книг.
 * Анализирует официальные маркировки 436-ФЗ в аннотации, жанры, теги,
 * Google Books API (maturityRating: "MATURE") и опционально LLM/AI.
 *
 * Запуск:
 *   cd backend && npx tsx scripts/backfill-age-ratings.ts
 * Опции:
 *   --dry-run   (только вывод в консоль, без записи в БД)
 *   --limit=100 (ограничение количества обрабатываемых книг)
 *   --all       (обрабатывать даже книги, у которых уже стоит ageRating)
 *   --ai        (использовать LLM/AI для книг, не распознанных по метаданным)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  detectAgeRatingFromMetadata,
  checkGoogleBooksMaturity,
  detectAgeRatingWithAi,
  type AgeRatingResult,
} from "../src/modules/books/ageRating.service.js";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const processAll = process.argv.includes("--all");
  const useAi = process.argv.includes("--ai");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  console.log(
    `Запуск разметки ageRating... [dryRun=${dryRun}, all=${processAll}, ai=${useAi}, limit=${limit}]`,
  );

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
    orderBy: { id: "asc" },
  });

  console.log(`Найдено книг для анализа: ${books.length}\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  const stats: Record<string, number> = {
    "18+": 0,
    "16+": 0,
    "12+": 0,
    "6+": 0,
    "0+": 0,
  };

  for (const book of books) {
    let result: AgeRatingResult | null = detectAgeRatingFromMetadata(book);

    // Если метаданные не дали рейтинг, но есть Google Books ID — опрашиваем Google Books API
    if (!result && book.source === "google_books" && book.externalId) {
      result = await checkGoogleBooksMaturity(book.externalId);
    }

    // Если всё ещё нет рейтинга и включен AI-режим (--ai) — опрашиваем LLM
    if (!result && useAi) {
      result = await detectAgeRatingWithAi({
        title: book.title,
        author: book.author,
        genre: book.genre,
        description: book.description,
      });
    }

    if (!result) {
      skippedCount++;
      continue;
    }

    stats[result.rating] = (stats[result.rating] || 0) + 1;
    updatedCount++;

    console.log(
      `[${result.rating}] #${book.id}: «${book.title}» (${book.author ?? "нет автора"}) — ${result.reason}`,
    );

    if (!dryRun) {
      await prisma.book.update({
        where: { id: book.id },
        data: { ageRating: result.rating },
      });
    }
  }

  console.log("\n================ Итоги разметки ================");
  console.log(`Всего размечено: ${updatedCount}`);
  for (const [rating, count] of Object.entries(stats)) {
    if (count > 0) {
      console.log(`  • ${rating}: ${count}`);
    }
  }
  console.log(`Пропущено (без явных признаков): ${skippedCount}`);
  if (dryRun) {
    console.log("\n(Запуск был в режиме --dry-run, изменения в БД не записаны)");
  }
}

main()
  .catch((e) => {
    console.error("Ошибка при разметке:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
