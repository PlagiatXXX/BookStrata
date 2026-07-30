/**
 * Прокси для изображений.
 *
 * 1. S3 → CDN (замена базового URL)
 * 2. Внешние обложки (Amazon, Goodreads, Livelib) → WebP-конвертация через /api/images/proxy
 * 3. Локальные URL — как есть
 */

const S3_BASE = "https://s3.twcstorage.ru/bookstrata";
const CDN_BASE = "https://re406cj9uj.cdn.twcstorage.ru";

/** Домены внешних источников, которые можно проксировать через WebP */
const EXTERNAL_DOMAINS = [
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "i.gr-assets.com",
  "s1.livelib.ru",
  "s2.livelib.ru",
  "s3.livelib.ru",
  "s4.livelib.ru",
  "cdn.litres.ru",
  "cdn1.litres.ru",
  "www.litres.ru",
  "litres.ru",
  "encrypted-tbn0.gstatic.com",
  "encrypted-tbn1.gstatic.com",
  "encrypted-tbn2.gstatic.com",
  "encrypted-tbn3.gstatic.com",
  "www.chitai-gorod.ru",
  "chitai-gorod.ru",
  "libcat.ru",
  "www.libcat.ru",
  "cdn.azbooka.ru",
  "azbooka.ru",
  "content.img-gorod.ru",
  "img-gorod.ru",
  "imo10.labirint.ru",
  "labirint.ru",
  "cdn.eksmo.ru",
  "eksmo.ru",
];

/**
 * Проверяет, выполняется ли код на сервере (prerender/SSR).
 */
function isServerSide(): boolean {
  return typeof window === "undefined" || !!(window as any).__PRERENDER__;
}

/**
 * Определяет, является ли URL внешним (требует прокси).
 */
function isExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return EXTERNAL_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith("." + domain),
    );
  } catch {
    return false;
  }
}

/**
 * Проксирует URL изображения:
 * - S3 → CDN (замена хоста)
 * - Внешние обложки (Amazon, Goodreads, Livelib) → /api/images/proxy
 * - Локальные — без изменений
 *
 * На сервере (prerender) внешние URL не проксируются — отдаются как есть.
 */
export function proxyImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  // S3 → CDN
  if (url.startsWith(S3_BASE)) {
    return url.replace(S3_BASE, CDN_BASE);
  }

  // Локальные URL (начинаются с /) — не трогаем
  if (url.startsWith("/")) {
    return url;
  }

  // Внешние URL — через WebP-прокси (только на клиенте)
  if (isExternalUrl(url)) {
    if (isServerSide()) {
      // При prerender'е бэкенд может не быть доступен — отдаём оригинал
      return url;
    }
    return `/api/images/proxy?url=${encodeURIComponent(url)}&width=300&quality=80`;
  }

  return url;
}

/**
 * Проксирует URL или возвращает null.
 */
export function proxyImageUrlOrNull(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  return proxyImageUrl(url) || null;
}
