/**
 * one-shot: генерация OG-изображений (1200×630) для существующих published-книг.
 *
 * Запуск:  npx tsx scripts/migrate-book-og-images.ts
 *
 * Скрипт:
 *   1. Находит все published-книги без ogImageUrl
 *   2. Скачивает обложку
 *   3. Генерирует OG-вариант 1200×630 (sharp, cover, attention)
 *   4. Загружает в хранилище (S3 или local — зависит от STORAGE_PROVIDER)
 *   5. Записывает ogImageUrl в БД
 *
 * Безопасен для повторного запуска — пропускает книги с уже заполненным ogImageUrl.
 */

import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { uploadBase64 } from "../src/lib/upload.js";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const prisma = new PrismaClient();

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const books = await prisma.book.findMany({
    where: {
      status: "published",
      ogImageUrl: null,
      coverImageUrl: { not: "" },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      coverImageUrl: true,
    },
  });

  console.log(`Найдено ${books.length} published-книг без OG-изображения`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const book of books) {
    const url = book.coverImageUrl;
    if (!url || url.includes("encrypted-tbn0.gstatic.com")) {
      console.log(`  SKIP ${book.slug} — нет валидной обложки`);
      skip++;
      continue;
    }

    try {
      console.log(`  ${book.slug} — скачиваю обложку...`);
      const buffer = await fetchBuffer(url);

      console.log(`  ${book.slug} — генерирую OG ${OG_WIDTH}×${OG_HEIGHT}...`);
      const ogBuffer = await sharp(buffer)
        .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "attention" })
        .webp({ quality: 85 })
        .toBuffer();

      const base64 = `data:image/webp;base64,${ogBuffer.toString("base64")}`;
      const result = await uploadBase64(base64, "tiermaker-pro/book-covers-og");

      await prisma.book.update({
        where: { id: book.id },
        data: { ogImageUrl: result.url },
      });

      console.log(`  OK  ${book.slug} → ${result.url}`);
      ok++;
    } catch (err) {
      console.error(`  FAIL ${book.slug}:`, err);
      fail++;
    }
  }

  console.log(`\nГотово: ${ok} ok, ${skip} skip, ${fail} fail из ${books.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
