// backend/src/lib/external-covers.ts
// Перевод внешних обложек (Amazon, LiveLib, Google, wikimedia и т.д.)
// на наш S3/CDN через image-proxy (WebP, кэш по хэшу URL).
// Используется при создании/обновлении коллекций, знаменитостей
// и в скрипте миграции существующих данных.

import { externalToCdnUrl } from "../modules/image-proxy/image-proxy.service.js";

const CONCURRENCY = 4;

async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = CONCURRENCY,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const idx = next++;
      const item = items[idx];
      if (item === undefined) return;
      results[idx] = await fn(item);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

/**
 * Переводит один URL на наш CDN. Если это уже своя/локальная картинка —
 * возвращает как есть. При ошибке конвертации — возвращает исходный URL
 * (не ломает сохранение коллекции из-за одной битой обложки).
 */
export async function migrateUrlToCdn(url: string): Promise<string> {
  const result = await externalToCdnUrl(url);
  return result ?? url;
}

export interface BookCoverShape {
  coverImageUrl?: string;
  [key: string]: unknown;
}

/**
 * Прогоняет все книги коллекции/знаменитости: внешние coverImageUrl
 * переводит на CDN, возвращает НОВЫЙ объект (старый не мутирует).
 */
export async function migrateBookCovers<T extends BookCoverShape>(
  books: Record<string, T>,
): Promise<Record<string, T>> {
  const entries = Object.entries(books);
  const migrated = await mapWithConcurrency(entries, async ([id, book]) => {
    const url = book.coverImageUrl;
    if (!url) return [id, book];
    const cdnUrl = await migrateUrlToCdn(url);
    return [id, cdnUrl === url ? book : { ...book, coverImageUrl: cdnUrl }];
  });
  return Object.fromEntries(migrated);
}

/** Прогоняет массив URL (например, bookCovers) через миграцию. */
export async function migrateUrlsArray(urls: string[]): Promise<string[]> {
  return mapWithConcurrency(urls, migrateUrlToCdn);
}