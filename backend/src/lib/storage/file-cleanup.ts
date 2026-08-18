// backend/src/lib/storage/file-cleanup.ts
// Очистка осиротевших файлов обложек: при замене обложки или удалении
// сущности старый файл удаляется из хранилища, ЕСЛИ он наш (S3/CDN/local)
// и на него больше никто не ссылается в БД.
import { createLogger } from "../logger.js";
import { prisma } from "../prisma.js";
import { config } from "../../config/env.js";
import { storage } from "./index.js";

const logger = createLogger("FileCleanup", { color: "yellow" });

const S3_HOST = config.S3_PUBLIC_HOST;
const CDN_HOST = config.CDN_PUBLIC_HOST;
const S3_BUCKET = config.S3_BUCKET;
const UPLOADS_PREFIX = config.UPLOADS_BASE_URL.startsWith("/")
  ? config.UPLOADS_BASE_URL
  : `/${config.UPLOADS_BASE_URL}`;

/**
 * Извлекает key файла из URL, если файл лежит в НАШЕМ хранилище:
 * - S3: {S3_PUBLIC_HOST}/{bucket}/{key} → key
 * - CDN: {CDN_PUBLIC_HOST}/{key} → key
 * - local: {UPLOADS_BASE_URL}/{folder}/{uuid}.ext → URL как есть
 * Возвращает null для внешних URL (Amazon, litres и т.д.) — их не трогаем.
 */
export function extractStorageKey(url: string | null | undefined): string | null {
  if (!url) return null;

  // Локальные файлы (STORAGE_PROVIDER=local)
  if (url.startsWith(UPLOADS_PREFIX)) return url;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === CDN_HOST) {
      return parsed.pathname.replace(/^\//, "");
    }
    if (host === S3_HOST) {
      const path = parsed.pathname.replace(/^\//, "");
      if (S3_BUCKET && path.startsWith(`${S3_BUCKET}/`)) {
        return path.slice(S3_BUCKET.length + 1);
      }
      // URL без имени бакета (например редиректы) — не трогаем
      return null;
    }
  } catch {
    // невалидный URL — не наш
  }
  return null;
}

/**
 * Проверяет, ссылается ли хоть одна запись БД на этот URL.
 * Все поля, куда могут попасть наши файлы (обложки книг, коллекций,
 * знаменитостей, тир-листов, вхождений, новостей, аватарок).
 */
export async function isUrlInUse(url: string): Promise<boolean> {
  const [
    book,
    collection,
    collectionCover,
    celebrity,
    tierList,
    placement,
    news,
    user,
    flag,
  ] = await Promise.all([
    prisma.book.findFirst({ where: { coverImageUrl: url }, select: { id: true } }),
    prisma.collection.findFirst({ where: { bookCovers: { has: url } }, select: { id: true } }),
    prisma.collection.findFirst({ where: { coverImageUrl: url }, select: { id: true } }),
    prisma.celebrity.findFirst({ where: { photoUrl: url }, select: { id: true } }),
    prisma.tierList.findFirst({ where: { coverImageUrl: url }, select: { id: true } }),
    prisma.bookPlacement.findFirst({ where: { coverImageUrl: url }, select: { tierListId: true } }),
    prisma.newsArticle.findFirst({ where: { imageUrl: url }, select: { id: true } }),
    prisma.user.findFirst({ where: { avatarUrl: url }, select: { id: true } }),
    prisma.contentFlag.findFirst({ where: { imageUrl: url }, select: { id: true } }),
  ]);

  return Boolean(
    book || collection || collectionCover || celebrity || tierList ||
      placement || news || user || flag,
  );
}

/**
 * Удаляет файл, если он наш и на него никто не ссылается.
 * Ошибки удаления не пробрасываются — это фоновая чистка.
 */
export async function deleteIfOrphaned(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;

  const key = extractStorageKey(url);
  if (!key) return false;

  try {
    if (await isUrlInUse(url)) {
      return false;
    }
    await storage.deleteFile(key);
    logger.info(`Удалён осиротевший файл: ${url}`);
    return true;
  } catch (err) {
    logger.warn(
      `Не удалось удалить файл ${url}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

/**
 * Удаляет старую обложку при её замене на новую (если URL реально изменился).
 */
export async function deleteCoverIfChanged(
  oldUrl: string | null | undefined,
  newUrl: string | null | undefined,
): Promise<void> {
  if (oldUrl && oldUrl !== newUrl) {
    await deleteIfOrphaned(oldUrl);
  }
}