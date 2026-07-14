/**
 * Экспорт slug'ов и названий коллекций для prerender'а.
 *
 * Генерирует src/data/collection-routes.json — файл, который prerender.mjs
 * использует как fallback, когда бэкенд недоступен во время сборки.
 *
 * Запуск:
 *   cd backend && npx tsx scripts/export-collection-routes.ts
 *
 * Когда запускать:
 *   - После создания/удаления/переименования коллекций в админке
 *   - Перед деплоем, если не уверены, что бэкенд будет доступен во время сборки
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
const OUTPUT_FILE = path.resolve(ROOT, "src/data/collection-routes.json");

const prisma = new PrismaClient();

interface CollectionRoute {
  slug: string;
  title: string;
}

async function main() {
  console.log("🔍 Подключаюсь к БД...");
  const collections = await prisma.collection.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    select: {
      slug: true,
      title: true,
    },
  });
  console.log(`  Найдено опубликованных коллекций: ${collections.length}`);

  const routes: CollectionRoute[] = collections.map((col) => ({
    slug: col.slug,
    title: col.title,
  }));

  // Сортируем по алфавиту slug для стабильности
  routes.sort((a, b) => a.slug.localeCompare(b.slug));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(routes, null, 2) + "\n", "utf-8");
  console.log(`\n✅ Файл записан: ${OUTPUT_FILE}`);
  console.log(`   Коллекций экспортировано: ${routes.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Ошибка:", err);
  process.exit(1);
});
