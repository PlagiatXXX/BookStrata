// backend/scripts/optimize-tier-book-covers.ts
// Оптимизация обложек книг в тир-листах до ширины 640px (Retina 2x для карточек и модалок).
// Уменьшает вес обложек на 80-90% (с 300-400 КиБ до ~25-35 КиБ), устраняя скролл-лаги
// при большом количестве книг в тир-листе и экономя трафик.
//
// Использование:
//   cd backend
//   npx tsx scripts/optimize-tier-book-covers.ts --dry-run                               # отчёт по всем обложкам
//   npx tsx scripts/optimize-tier-book-covers.ts --slug prochitannoe-2026-fjm6v7 --dry-run  # проверка одного тир-листа
//   npx tsx scripts/optimize-tier-book-covers.ts --slug prochitannoe-2026-fjm6v7            # оптимизация одного тир-листа
//   npx tsx scripts/optimize-tier-book-covers.ts                                        # оптимизация всех обложек
//
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const TARGET_WIDTH = 640;

const slugArgIndex = process.argv.indexOf("--slug");
const FILTER_SLUG = slugArgIndex !== -1 && process.argv[slugArgIndex + 1] ? process.argv[slugArgIndex + 1] : null;

const S3_BUCKET = process.env.S3_BUCKET || "bookstrata";
const S3_ENDPOINT = process.env.S3_ENDPOINT || "https://s3.twcstorage.ru";
const S3_REGION = process.env.S3_REGION || "ru-1";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "";
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "";
const UPLOADS_DIR = process.env.UPLOADS_DIR || "uploads";
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "s3";

const isS3 = STORAGE_PROVIDER === "s3";

const s3Client = isS3
  ? new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: false,
    })
  : null;

function log(msg: string) {
  console.log(msg);
}

/** Извлекает ключ S3 или локальный путь из coverImageUrl */
function extractStorageKey(url: string): { key: string; isLocal: boolean } | null {
  if (url.startsWith("/uploads/")) {
    return { key: url.replace(/^\/uploads\//, ""), isLocal: true };
  }
  try {
    const parsed = new URL(url);
    // Например: https://bookstrata.ru/img/tiermaker-pro/book-covers/uuid.webp
    // Или прямая ссылка на S3
    const match = parsed.pathname.match(/(?:^\/img\/|^.*?\/bookstrata\/)(.+)$/);
    if (match && match[1]) {
      return { key: match[1], isLocal: false };
    }
    // Если путь содержит tiermaker-pro/book-covers/...
    const idx = parsed.pathname.indexOf("tiermaker-pro/");
    if (idx !== -1) {
      return { key: parsed.pathname.slice(idx), isLocal: false };
    }
  } catch {
    if (url.startsWith("/img/")) {
      return { key: url.replace(/^\/img\//, ""), isLocal: false };
    }
  }
  return null;
}

async function getBuffer(url: string, keyInfo: { key: string; isLocal: boolean }): Promise<Buffer | null> {
  if (keyInfo.isLocal) {
    const localPath = join(UPLOADS_DIR, keyInfo.key);
    try {
      return await fs.readFile(localPath);
    } catch {
      return null;
    }
  }

  if (s3Client && S3_BUCKET) {
    try {
      const res = await s3Client.send(
        new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: keyInfo.key,
        }),
      );
      if (res.Body) {
        const byteArray = await res.Body.transformToByteArray();
        return Buffer.from(byteArray);
      }
    } catch {
      // Фолбэк на HTTP fetch ниже
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

async function saveBuffer(keyInfo: { key: string; isLocal: boolean }, buffer: Buffer): Promise<void> {
  if (keyInfo.isLocal) {
    const localPath = join(UPLOADS_DIR, keyInfo.key);
    await fs.writeFile(localPath, buffer);
    return;
  }

  if (s3Client && S3_BUCKET) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: keyInfo.key,
        Body: buffer,
        ContentType: "image/webp",
      }),
    );
  }
}

async function main() {
  log("=================================================");
  log(` Оптимизация обложек книг в тир-листах (макс. ширина: ${TARGET_WIDTH}px)`);
  if (FILTER_SLUG) log(` Фильтр по тир-листу: ${FILTER_SLUG}`);
  if (DRY_RUN) log(" РЕЖИМ ПРОВЕРКИ (--dry-run), файлы не перезаписываются");
  log("=================================================\n");

  let books: { id: number; title: string; coverImageUrl: string | null }[] = [];

  if (FILTER_SLUG) {
    const tierList = await prisma.tierList.findUnique({
      where: { slug: FILTER_SLUG },
      include: {
        placements: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                coverImageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!tierList) {
      log(`❌ Тир-лист со слагом "${FILTER_SLUG}" не найден в базе данных`);
      process.exit(1);
    }

    books = tierList.placements
      .map((p) => p.book)
      .filter((b): b is NonNullable<typeof b> => Boolean(b && b.coverImageUrl));
  } else {
    books = await prisma.book.findMany({
      where: {
        coverImageUrl: {
          contains: "tiermaker-pro/book-covers",
        },
      },
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
      },
      orderBy: { id: "asc" },
    });
  }

  // Убираем дубликаты по URL, чтобы не сжимать один и тот же файл дважды
  const uniqueByUrl = new Map<string, typeof books[0]>();
  for (const b of books) {
    if (b.coverImageUrl && !uniqueByUrl.has(b.coverImageUrl)) {
      uniqueByUrl.set(b.coverImageUrl, b);
    }
  }

  const items = Array.from(uniqueByUrl.values());
  log(`Найдено уникальных обложек для проверки: ${items.length}\n`);

  let optimizedCount = 0;
  let alreadyOptimalCount = 0;
  let skippedCount = 0;
  let totalSavedBytes = 0;

  for (const b of items) {
    if (!b.coverImageUrl) continue;

    const keyInfo = extractStorageKey(b.coverImageUrl);
    if (!keyInfo) {
      log(`⚠️  [ПРОПУСК] ${b.title} (${b.coverImageUrl}): не удалось определить ключ`);
      skippedCount++;
      continue;
    }

    const origBuffer = await getBuffer(b.coverImageUrl, keyInfo);
    if (!origBuffer) {
      log(`⚠️  [ОШИБКА] ${b.title}: не удалось скачать файл (${keyInfo.key})`);
      skippedCount++;
      continue;
    }

    let meta: sharp.Metadata;
    try {
      meta = await sharp(origBuffer).metadata();
    } catch {
      log(`⚠️  [ОШИБКА] ${b.title}: повреждённый формат изображения`);
      skippedCount++;
      continue;
    }

    const origWidth = meta.width || 0;
    const origHeight = meta.height || 0;
    const origSize = origBuffer.length;

    if (origWidth <= TARGET_WIDTH) {
      alreadyOptimalCount++;
      log(`✓  [ОК] ${b.title}: ширина ${origWidth}px <= ${TARGET_WIDTH}px (${(origSize / 1024).toFixed(1)} KiB)`);
      continue;
    }

    // Ресайз до TARGET_WIDTH
    const newBuffer = await sharp(origBuffer)
      .resize(TARGET_WIDTH, undefined, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const newSize = newBuffer.length;
    const savedBytes = origSize - newSize;
    totalSavedBytes += savedBytes;
    optimizedCount++;

    const percent = Math.round((savedBytes / origSize) * 100);
    const origKiB = (origSize / 1024).toFixed(1);
    const newKiB = (newSize / 1024).toFixed(1);

    if (DRY_RUN) {
      log(`🔍 [ТРЕБУЕТСЯ РЕСАЙЗ] ${b.title}: ${origWidth}x${origHeight} (${origKiB} KiB) → 640px (${newKiB} KiB), экономия: ${percent}%`);
    } else {
      await saveBuffer(keyInfo, newBuffer);
      log(`✓ [ОПТИМИЗИРОВАНО] ${b.title}: ${origWidth}x${origHeight} (${origKiB} KiB) → 640px (${newKiB} KiB), сэкономлено: ${percent}%`);
    }
  }

  log("\n=================================================");
  log(`Итоги:`);
  log(`  Всего проверено: ${items.length}`);
  log(`  Оптимизировано: ${optimizedCount}`);
  log(`  Уже оптимальны (<= ${TARGET_WIDTH}px): ${alreadyOptimalCount}`);
  log(`  Пропущено / ошибок: ${skippedCount}`);
  log(`  Сэкономлено трафика: ${(totalSavedBytes / 1024).toFixed(1)} KiB (${(totalSavedBytes / 1024 / 1024).toFixed(2)} MiB)`);
  log("=================================================");
}

main()
  .catch((err) => {
    console.error("Критическая ошибка:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
