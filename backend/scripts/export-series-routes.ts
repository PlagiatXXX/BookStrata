/**
 * Экспорт slug'ов и названий циклов книг для prerender'а.
 *
 * Генерирует src/data/series-routes.json — файл, который prerender.mjs
 * использует для генерации статических HTML-страниц /series/:slug.
 * Экспортируются только циклы с ≥2 опубликованными каталоговыми книгами
 * (защита от thin content).
 *
 * Запуск:
 *   cd backend && npx tsx scripts/export-series-routes.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = (() => {
  const candidates = [
    path.resolve(__dirname, "../.."),
    "/app",
    process.cwd(),
    path.resolve(process.cwd(), ".."),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "src", "data"))) return c;
  }
  return path.resolve(__dirname, "../..");
})();

const OUTPUT_FILE = path.resolve(ROOT, "src/data/series-routes.json");

const prisma = new PrismaClient();

interface SeriesRoute {
  slug: string;
  name: string;
}

async function main() {
  console.log("🔍 Подключаюсь к БД...");
  const seriesList = await prisma.series.findMany({
    where: {
      books: { some: { status: "published", userId: null, mergedIntoId: null } },
    },
    select: {
      slug: true,
      name: true,
      books: {
        where: { status: "published", userId: null, mergedIntoId: null },
        select: { id: true },
        take: 2,
      },
    },
  });

  const routes: SeriesRoute[] = seriesList
    .filter((s) => s.books.length >= 2)
    .map((s) => ({ slug: s.slug, name: s.name }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(routes, null, 2) + "\n", "utf-8");
  console.log(`✅ Файл записан: ${OUTPUT_FILE}`);
  console.log(`   Циклов экспортировано: ${routes.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Ошибка:", err);
  process.exit(1);
});
