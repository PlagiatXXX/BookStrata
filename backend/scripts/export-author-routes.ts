/**
 * Экспорт slug'ов и имён авторов для prerender'а.
 *
 * Генерирует src/data/author-routes.json — файл, который prerender.mjs
 * использует для списка пререндер-роутов /authors/:slug (по образцу
 * export-book-routes.ts).
 *
 * Экспортируются все авторы со slug: страница отдаётся и без seoDescription
 * (см. authors.route.spec — ручной контент публикуется), а пререндер нужен
 * для индексации (nginx отдаёт авторам SPA-каркас, пока файлов нет).
 *
 * Запуск:
 *   cd backend && npx tsx scripts/export-author-routes.ts
 *
 * Когда запускать:
 *   - После генерации SEO-описаний (generate-author-seos.ts)
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
const OUTPUT_FILE = path.resolve(ROOT, "src/data/author-routes.json");

const prisma = new PrismaClient();

interface AuthorRoute {
  slug: string;
  name: string;
}

async function main() {
  console.log("🔍 Подключаюсь к БД...");
  const authors = await prisma.author.findMany({
    where: { slug: { not: null } },
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
    },
  });
  console.log(`  Найдено авторов со slug: ${authors.length}`);

  const routes: AuthorRoute[] = authors
    .filter((author) => !!author.slug)
    .map((author) => ({ slug: author.slug as string, name: author.name }));

  // Сортируем по алфавиту slug для стабильности
  routes.sort((a, b) => a.slug.localeCompare(b.slug));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(routes, null, 2) + "\n", "utf-8");
  console.log(`\n✅ Файл записан: ${OUTPUT_FILE}`);
  console.log(`   Авторов экспортировано: ${routes.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Ошибка:", err);
  process.exit(1);
});
