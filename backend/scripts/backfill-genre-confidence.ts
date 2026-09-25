/**
 * Разовый batch: проставляет genreConfidence в Book.readingProfile
 * для published-книг, у которых поле отсутствует (ИИ оценивает точность
 * жанра по жанру/тегам/описанию). Осей Reading DNA не трогает.
 *
 * Запуск (вручную, нужен ключ OPENROUTER_API_KEY или CUSTOM_AI_API_KEY в .env):
 *   cd backend && npx tsx scripts/backfill-genre-confidence.ts
 *
 * Опции: --dry-run (только печать, без записи), --limit=N.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { routeAiResponse } from "../src/modules/ai-librarian/router.js";
import { extractGenreConfidence } from "../src/modules/books/genreConfidenceExtract.js";

const prisma = new PrismaClient();

function buildPrompt(book: { title: string; author: string | null; genre: string | null; tags: string[]; description: string | null }): string {
  return `Жанр: ${book.genre ?? "не указан"}
Теги: ${book.tags.join(", ") || "нет"}
Описание: ${(book.description ?? "").slice(0, 600)}
Книга: «${book.title}»${book.author ? ` — ${book.author}` : ""}

Оцени, насколько заявленный жанр подтверждается тегами и описанием.
Верни ТОЛЬКО число от 0 до 1 (например 0.85), без пояснений.`;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  const books = await prisma.book.findMany({
    where: {
      status: "published",
      readingProfile: { not: Prisma.DbNull },
    },
    select: { id: true, title: true, author: true, genre: true, tags: true, description: true, readingProfile: true },
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const book of books) {
    if (updated >= limit) break;
    const profile = book.readingProfile as Record<string, unknown> | null;
    if (!profile || typeof profile.genreConfidence === "number") {
      skipped++;
      continue;
    }

    try {
      let full = "";
      for await (const chunk of routeAiResponse(
        [{ role: "user", content: buildPrompt(book) }],
        "Ты — литературный аналитик. Отвечай строго по формату запроса.",
      )) {
        if (!chunk.done) full += chunk.content;
      }

      const value = extractGenreConfidence(full);
      if (value === null) {
        console.warn(`⚠️ ${book.id} «${book.title}» — не распознан ответ: ${full.slice(0, 80)}`);
        failed++;
        continue;
      }

      if (dryRun) {
        console.log(`[dry-run] ${book.id} «${book.title}» → ${value}`);
      } else {
        await prisma.book.update({
          where: { id: book.id },
          data: {
            readingProfile: { ...profile, genreConfidence: value } as Prisma.InputJsonValue,
          },
        });
        console.log(`✓ ${book.id} «${book.title}» → ${value}`);
      }
      updated++;
    } catch (err) {
      failed++;
      console.error(`✗ ${book.id} «${book.title}»:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Готово. Записано/проверено: ${updated}, пропущено (уже есть): ${skipped}, ошибок: ${failed}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
