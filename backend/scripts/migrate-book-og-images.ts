/**
 * one-shot: генерация OG-изображений (1200×630) для существующих published-книг.
 *
 * Запуск (в контейнере):  docker exec bookstrata-api npx tsx scripts/migrate-book-og-images.ts
 *
 * Безопасен для повторного запуска — пропускает книги с уже заполненным ogImageUrl.
 */

import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "node:crypto";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const prisma = new PrismaClient();

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "ru-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false,
});

const BUCKET = process.env.S3_BUCKET!;
const PUBLIC_HOST = process.env.S3_PUBLIC_HOST!;

function publicUrl(key: string): string {
  return `https://${PUBLIC_HOST}/${BUCKET}/${key}`;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadBuffer(buffer: Buffer, folder: string): Promise<string> {
  const key = `${folder}/${crypto.randomUUID()}.webp`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: "image/webp",
    ACL: "public-read",
  }));
  return publicUrl(key);
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

      const ogUrl = await uploadBuffer(ogBuffer, "tiermaker-pro/book-covers-og");

      await prisma.book.update({
        where: { id: book.id },
        data: { ogImageUrl: ogUrl },
      });

      console.log(`  OK  ${book.slug} → ${ogUrl}`);
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
