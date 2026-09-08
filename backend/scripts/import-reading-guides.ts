/**
 * Bulk-импорт AI-паспортов «Гид по чтению» (Book.readingGuide).
 *
 * Оператор генерирует паспорта во внешнем ИИ-чате пачками (10–20 книг),
 * складывает в JSON-файл и запускает этот скрипт. Валидация — той же
 * zod-схемой, что и в админке (readingGuide.schema.ts): невалидные записи
 * НЕ заливаются и перечисляются в отчёте.
 *
 * Формат входного файла (reading-guides.json):
 * [
 *   { "slug": "dyuna", "guide": { ...7 полей паспорта... } },
 *   ...
 * ]
 *
 * Запуск:
 *   cd backend && DATABASE_URL=... npx tsx scripts/import-reading-guides.ts \
 *     --file ../reading-guides.json
 *
 * Флаги:
 *   --file <path>   путь к JSON-файлу импорта (обязателен)
 *   --dry-run       только проверка валидности, без записи в БД
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { readingGuideSchema } from "../src/modules/books/readingGuide.schema.js";

interface ImportEntry {
  slug: string;
  guide: unknown;
}

async function main() {
  // --- Парсинг аргументов ---
  const args = process.argv.slice(2);
  let filePath: string | null = null;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && typeof args[i + 1] === "string") {
      filePath = args[i + 1] as string;
      i++;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }
  if (!filePath) {
    console.error("❌ Укажите --file <path> (JSON-файл импорта)");
    process.exit(1);
  }

  // --- Чтение файла ---
  const sourcePath = filePath as string;
  let entries: ImportEntry[];
  try {
    let raw = fs.readFileSync(path.resolve(sourcePath), "utf-8").trim();
    // Срезаем markdown-обёртку, если оператор скопировал ответ ИИ
    // целиком (```json ... ```) — как в админ-поле (sanitizeAndParseReadingGuide)
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    }
    entries = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Не удалось прочитать/распарсить файл: ${(err as Error).message}`);
    process.exit(1);
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    console.error("❌ Файл должен содержать непустой JSON-массив [{ slug, guide }]");
    process.exit(1);
  }
  console.log(`📖 Записей в файле: ${entries.length}${dryRun ? " (dry-run)" : ""}`);

  const prisma = new PrismaClient();
  const report = {
    imported: [] as string[],
    skippedInvalid: [] as { slug: string; reason: string }[],
    notFound: [] as string[],
    alreadyHas: [] as string[],
  };

  try {
    for (const entry of entries) {
      const slug = typeof entry?.slug === "string" ? entry.slug.trim() : "";
      if (!slug) {
        report.skippedInvalid.push({ slug: "(пустой slug)", reason: "отсутствует поле slug" });
        continue;
      }

      // 1. Валидация паспорта схемой (единая с админкой)
      const parsed = readingGuideSchema.safeParse(entry.guide);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const reason = issue
          ? `${issue.path.join(".") || "(корень)"}: ${issue.message}`
          : "неизвестная ошибка валидации";
        report.skippedInvalid.push({ slug, reason });
        continue;
      }

      // 2. Поиск книги по slug
      const book = await prisma.book.findUnique({
        where: { slug },
        select: { id: true, readingGuide: true },
      });
      if (!book) {
        report.notFound.push(slug);
        continue;
      }

      // 3. Не перезаписываем существующий паспорт (штучные правки — в админке)
      if (book.readingGuide) {
        report.alreadyHas.push(slug);
        continue;
      }

      if (!dryRun) {
        await prisma.book.update({
          where: { id: book.id },
          data: { readingGuide: parsed.data },
        });
      }
      report.imported.push(slug);
    }
  } finally {
    await prisma.$disconnect();
  }

  // --- Отчёт ---
  console.log(`\n✅ Залито: ${report.imported.length}`);
  if (report.imported.length > 0) {
    console.log("   " + report.imported.join(", "));
  }
  if (report.alreadyHas.length > 0) {
    console.log(`⏭  Пропущено (паспорт уже есть): ${report.alreadyHas.length}`);
    console.log("   " + report.alreadyHas.join(", "));
  }
  if (report.notFound.length > 0) {
    console.log(`🔍 Книги не найдены по slug: ${report.notFound.length}`);
    console.log("   " + report.notFound.join(", "));
  }
  if (report.skippedInvalid.length > 0) {
    console.log(`⚠️  Невалидные записи (НЕ залиты): ${report.skippedInvalid.length}`);
    for (const item of report.skippedInvalid) {
      console.log(`   ${item.slug}: ${item.reason}`);
    }
    // Ненулевой код, если есть невалидные — заметно в CI/скриптах
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error("❌ Ошибка:", err);
  process.exit(1);
});
