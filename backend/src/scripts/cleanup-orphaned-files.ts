/**
 * Скрипт зачистки осиротевших файлов изображений в S3-бакете.
 *
 * Что делает:
 *  1. Собирает ВСЕ URL картинок из БД (обложки книг/коллекций/знаменитостей/
 *     тир-листов/вхождений, фото новостей, аватарки, файлы жалоб).
 *  2. Перечисляет ключи бакета (ListObjectsV2, включая image-cache).
 *  3. Для каждого файла строит оба варианта URL (S3 и CDN) и удаляет файл,
 *     если ни один из них не используется в БД.
 *
 * Запуск:
 *   npx tsx src/scripts/cleanup-orphaned-files.ts            # dry-run (по умолчанию)
 *   npx tsx src/scripts/cleanup-orphaned-files.ts --delete    # реальное удаление
 */
import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../config/env.js";

const prisma = new PrismaClient();

const BUCKET = config.S3_BUCKET;
if (!BUCKET) {
  console.error("S3_BUCKET не задан — скрипт работает только с S3-хранилищем.");
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY_ID!,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false,
});

const DRY_RUN = !process.argv.includes("--delete");

/** Все URL, на которые ссылается БД (в любом поле с картинками). */
async function collectUsedUrls(): Promise<Set<string>> {
  const urls = new Set<string>();
  const add = (u: string | null | undefined) => {
    if (u) urls.add(u);
  };

  const [books, collections, celebrities, tierLists, placements, news, users, flags] =
    await Promise.all([
      prisma.book.findMany({ select: { coverImageUrl: true } }),
      prisma.collection.findMany({ select: { coverImageUrl: true, bookCovers: true } }),
      prisma.celebrity.findMany({ select: { photoUrl: true } }),
      prisma.tierList.findMany({ select: { coverImageUrl: true } }),
      prisma.bookPlacement.findMany({ select: { coverImageUrl: true } }),
      prisma.newsArticle.findMany({ select: { imageUrl: true } }),
      prisma.user.findMany({ select: { avatarUrl: true } }),
      prisma.contentFlag.findMany({ select: { imageUrl: true } }),
    ]);

  books.forEach((b) => add(b.coverImageUrl));
  collections.forEach((c) => {
    add(c.coverImageUrl);
    c.bookCovers.forEach(add);
  });
  celebrities.forEach((c) => add(c.photoUrl));
  tierLists.forEach((t) => add(t.coverImageUrl));
  placements.forEach((p) => add(p.coverImageUrl));
  news.forEach((n) => add(n.imageUrl));
  users.forEach((u) => add(u.avatarUrl));
  flags.forEach((f) => add(f.imageUrl));

  return urls;
}

/** Все URL-варианты, под которыми файл с этим ключом может быть в БД. */
function urlsForKey(key: string): string[] {
  return [
    `https://${config.S3_PUBLIC_HOST}/${BUCKET}/${key}`,
    `https://${config.CDN_PUBLIC_HOST}/${key}`,
  ];
}

async function* listKeys(): AsyncGenerator<string> {
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) yield obj.Key;
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
}

async function main() {
  console.log("🔍 Собираем используемые URL из БД...");
  const used = await collectUsedUrls();
  console.log(`   Найдено ${used.size} используемых URL\n`);

  console.log(`📦 Перечисляем файлы бакета "${BUCKET}"...`);
  let total = 0;
  let orphans = 0;
  let deleted = 0;
  const SHOW_MAX = 50;

  for await (const key of listKeys()) {
    total++;
    const urls = urlsForKey(key);
    if (urls.some((u) => used.has(u))) continue;

    orphans++;
    if (orphans <= SHOW_MAX) {
      console.log(`  🗑️ ${key}`);
    }

    if (!DRY_RUN) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      deleted++;
    }
  }

  console.log(`\n✅ Готово: файлов в бакете — ${total}, осиротевших — ${orphans}.`);
  if (DRY_RUN) {
    console.log(
      "   Это dry-run: ничего не удалено. Для удаления запусти с флагом --delete.",
    );
  } else {
    console.log(`   Удалено файлов: ${deleted}.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});