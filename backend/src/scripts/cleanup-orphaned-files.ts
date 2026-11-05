/**
 * Скрипт зачистки осиротевших файлов изображений в S3-бакете.
 *
 * Что делает:
 *  1. Собирает ВСЕ URL картинок из БД (обложки книг/коллекций/знаменитостей/
 *     тир-листов/вхождений, фото авторов, фото новостей, аватарки, иконки достижений, файлы жалоб).
 *  2. Строит множество MD5-хэшей внешних URL (Google Books, Amazon и др.)
 *     для защиты закэшированных картинок в image-cache/*.webp.
 *  3. Перечисляет ключи бакета (ListObjectsV2).
 *  4. Для каждого файла проверяет, используется ли он (напрямую или через image-cache).
 *     Если нет — помечает как осиротевший и удаляет (при флаге --delete).
 *
 * Запуск:
 *   node dist/src/scripts/cleanup-orphaned-files.js              # dry-run (по умолчанию)
 *   node dist/src/scripts/cleanup-orphaned-files.js --delete     # реальное удаление
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../config/env.js";

export const prisma = new PrismaClient();

export const BUCKET = config.S3_BUCKET ?? "";

export const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: config.S3_SECRET_ACCESS_KEY ?? "",
  },
  forcePathStyle: false,
});

export const DRY_RUN = !process.argv.includes("--delete");

/**
 * Все URL, на которые ссылается БД (в любом поле с картинками).
 */
export async function collectUsedUrls(client: any = prisma): Promise<Set<string>> {
  const urls = new Set<string>();
  const add = (u: string | null | undefined) => {
    if (!u) return;
    const trimmed = u.trim();
    if (!trimmed) return;
    urls.add(trimmed);

    // Добавляем версию без query параметров и hash (#t=... / ?v=...)
    const clean = trimmed.split("#")[0]?.split("?")[0];
    if (clean && clean !== trimmed) {
      urls.add(clean);
    }
  };

  // Рекурсивно собирает все строки-URL из JSON-снимков (Collection.books/tiers,
  // Celebrity.books/tiers, Template.defaultBooks): карточки хранят наши CDN-обложки.
  // Лишние строки в Set безопасны — они лишь защищают файлы от удаления.
  const addJsonUrls = (value: unknown) => {
    if (typeof value === "string") {
      if (value.startsWith("http") || value.startsWith("/uploads")) add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(addJsonUrls);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(addJsonUrls);
    }
  };

  const [
    books,
    authors,
    collections,
    celebrities,
    tierLists,
    placements,
    news,
    users,
    flags,
    templates,
    achievements,
  ] = await Promise.all([
    client.book.findMany({ select: { coverImageUrl: true, ogImageUrl: true, animatedCoverUrl: true } }),
    client.author.findMany({ select: { heroImageUrl: true } }),
    client.collection.findMany({
      select: { coverImageUrl: true, bookCovers: true, books: true, tiers: true },
    }),
    client.celebrity.findMany({ select: { photoUrl: true, books: true, tiers: true } }),
    client.tierList.findMany({ select: { coverImageUrl: true } }),
    client.bookPlacement.findMany({ select: { coverImageUrl: true } }),
    client.newsArticle.findMany({ select: { imageUrl: true } }),
    client.user.findMany({ select: { avatarUrl: true } }),
    client.contentFlag.findMany({ select: { imageUrl: true } }),
    client.template.findMany({ select: { defaultBooks: true } }),
    client.achievement.findMany({ select: { iconUrl: true } }),
  ]);

  books.forEach((b: any) => {
    add(b.coverImageUrl);
    add(b.ogImageUrl);
    add(b.animatedCoverUrl);
  });
  authors.forEach((a: any) => add(a.heroImageUrl));
  collections.forEach((c: any) => {
    add(c.coverImageUrl);
    c.bookCovers?.forEach(add);
    addJsonUrls(c.books);
    addJsonUrls(c.tiers);
  });
  celebrities.forEach((c: any) => {
    add(c.photoUrl);
    addJsonUrls(c.books);
    addJsonUrls(c.tiers);
  });
  tierLists.forEach((t: any) => add(t.coverImageUrl));
  placements.forEach((p: any) => add(p.coverImageUrl));
  news.forEach((n: any) => add(n.imageUrl));
  users.forEach((u: any) => add(u.avatarUrl));
  flags.forEach((f: any) => add(f.imageUrl));
  templates.forEach((t: any) => addJsonUrls(t.defaultBooks));
  achievements.forEach((a: any) => add(a.iconUrl));

  return urls;
}

/**
 * Строит множество ключей image-cache/<md5>.webp для всех внешних URL,
 * которые используются в БД (Google Books, Amazon, LiveLib и т.д.).
 */
export function buildUsedImageCacheKeys(urls: Set<string>): Set<string> {
  const cacheKeys = new Set<string>();
  for (const url of urls) {
    if (typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
      const hash = createHash("md5").update(url).digest("hex");
      cacheKeys.add(`image-cache/${hash}.webp`);

      const clean = url.split("#")[0]?.split("?")[0];
      if (clean && clean !== url) {
        const cleanHash = createHash("md5").update(clean).digest("hex");
        cacheKeys.add(`image-cache/${cleanHash}.webp`);
      }
    }
  }
  return cacheKeys;
}

/** Все URL-варианты, под которыми файл с этим ключом может быть в БД. */
export function urlsForKey(key: string, bucket = BUCKET): string[] {
  const cleanKey = key.replace(/^\//, "");
  return [
    cleanKey,
    `/${cleanKey}`,
    `${config.MEDIA_PUBLIC_URL}/${cleanKey}`,
    `https://${config.S3_PUBLIC_HOST}/${bucket}/${cleanKey}`,
    `https://${config.CDN_PUBLIC_HOST}/${cleanKey}`,
    `/uploads/${cleanKey}`,
    `https://bookstrata.ru/img/${cleanKey}`,
  ];
}

/**
 * Определяет, является ли ключ файла в бакете сиротой (не используется в БД).
 */
export function isOrphanKey(
  key: string,
  usedUrls: Set<string>,
  usedCacheKeys: Set<string>,
  bucket = BUCKET,
): boolean {
  if (usedCacheKeys.has(key)) return false;
  if (usedUrls.has(key)) return false;
  const candidates = urlsForKey(key, bucket);
  return !candidates.some((u) => usedUrls.has(u));
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
  if (!BUCKET) {
    console.error("S3_BUCKET не задан — скрипт работает только с S3-хранилищем.");
    process.exit(1);
  }

  console.log("🔍 Собираем используемые URL из БД...");
  const used = await collectUsedUrls();
  console.log(`   Найдено ${used.size} используемых URL`);

  const usedCacheKeys = buildUsedImageCacheKeys(used);
  console.log(`   Защищено записей кэша внешних обложек: ${usedCacheKeys.size}\n`);

  console.log(`📦 Перечисляем файлы бакета "${BUCKET}"...`);
  let total = 0;
  let orphans = 0;
  let deleted = 0;
  const SHOW_MAX = 50;

  for await (const key of listKeys()) {
    total++;
    if (!isOrphanKey(key, used, usedCacheKeys, BUCKET)) continue;

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

// Запускаем main() только если скрипт вызван напрямую (не в тестах)
const isDirectRun =
  process.env.NODE_ENV !== "test" &&
  (process.argv[1]?.endsWith("cleanup-orphaned-files.ts") ||
    process.argv[1]?.endsWith("cleanup-orphaned-files.js"));

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
