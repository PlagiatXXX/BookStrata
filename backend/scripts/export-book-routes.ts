/**
 * Экспорт slug'ов и названий опубликованных книг для prerender'а.
 *
 * Генерирует src/data/book-routes.json — файл, который prerender.mjs
 * использует для списка пререндер-роутов /books/:slug (по образцу
 * export-collection-routes.ts, см. Фазу 6 seobook.md).
 *
 * Запуск:
 *   cd backend && npx tsx scripts/export-book-routes.ts
 *
 * Когда запускать:
 *   - После публикации новых книг в каталоге (status → published)
 *   - Перед деплоем (вызывается deploy-server.sh автоматически)
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к корню проекта (backend/ → BookStrata/)
const ROOT = path.resolve(__dirname, "../..");
// Куда писать JSON (относительно корня проекта)
const OUTPUT_FILE = path.resolve(ROOT, "src/data/book-routes.json");

const prisma = new PrismaClient();

interface BookRoute {
  slug: string;
  title: string;
}

async function main() {
  console.log("🔍 Подключаюсь к БД...");
  const books = await prisma.book.findMany({
    where: { status: "published", slug: { not: null } },
    orderBy: { publishedAt: "asc" },
    select: {
      slug: true,
      title: true,
    },
  });
  console.log(`  Найдено опубликованных книг: ${books.length}`);

  const routes: BookRoute[] = books
    .filter((book) => !!book.slug)
    .map((book) => ({ slug: book.slug as string, title: book.title }));

  // Сортируем по алфавиту slug для стабильности
  routes.sort((a, b) => a.slug.localeCompare(b.slug));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(routes, null, 2) + "\n", "utf-8");
  console.log(`\n✅ Файл записан: ${OUTPUT_FILE}`);
  console.log(`   Книг экспортировано: ${routes.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Ошибка:", err);
  process.exit(1);
});
