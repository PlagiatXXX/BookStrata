/**
 * Прокси для изображений.
 *
 * 1. S3 → CDN (замена базового URL)
 * 2. Внешние обложки (Amazon, Goodreads, Livelib) → WebP-конвертация через /api/images/proxy
 * 3. Локальные URL — как есть
 *
 * Если передан width — изображение ресайзится через /api/images/proxy
 * и кэшируется на S3 (повторные запросы — с CDN, без нагрузки на бэкенд).
 */

const S3_BASE = "https://s3.twcstorage.ru/bookstrata";
const CDN_BASE = "https://re406cj9uj.cdn.twcstorage.ru";

/** Допустимые ширины ресайза (защита от перебора S3 разными размерами) */
const ALLOWED_RESIZE_WIDTHS = [64, 300, 730] as const;
type AllowedResizeWidth = typeof ALLOWED_RESIZE_WIDTHS[number];

function clampWidth(width: number): AllowedResizeWidth {
  // Округляем до ближайшего разрешённого значения
  const sorted = [...ALLOWED_RESIZE_WIDTHS].sort((a, b) => a - b);
  let closest = sorted[0];
  let minDiff = Math.abs(width - closest);

  for (const w of sorted) {
    const diff = Math.abs(width - w);
    if (diff < minDiff) {
      minDiff = diff;
      closest = w;
    }
  }
  return closest as AllowedResizeWidth;
}

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
  return typeof window === "undefined" || !!(window as Window & { __PRERENDER__?: boolean }).__PRERENDER__;
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
 * Если передан width — изображение ресайзится под нужную ширину
 * через /api/images/proxy (с кэшированием на S3).
 *
 * На сервере (prerender) прокси не вызывается — отдаём оригинал.
 */
export function proxyImageUrl(
  url: string | null | undefined,
  width?: number,
): string {
  if (!url) return "";

  const isLocal = url.startsWith("/");
  const finalWidth = width ? clampWidth(width) : undefined;

  // S3 → CDN (без прокси — CDN уже быстрый, ресайз не нужен,
  // round-trip к прокси убивает LCP: +1.5-2s к Resource load delay)
  if (url.startsWith(S3_BASE)) {
    return url.replace(S3_BASE, CDN_BASE);
  }

  // Локальные URL — не трогаем (будут нарезаны статически)
  if (isLocal) {
    return url;
  }

  // CDN-изображения (загруженные файлы) — прямой URL без прокси.
  // CDN уже быстрый, а ресайз через прокси добавляет latency;
  // object-cover на клиенте решает проблему размеров.
  if (url.startsWith(CDN_BASE)) {
    return url;
  }

  // Внешние URL — через WebP-прокси (только на клиенте)
  if (isExternalUrl(url)) {
    if (isServerSide()) {
      return url;
    }
    const w = finalWidth ?? 300;
    return `/api/images/proxy?url=${encodeURIComponent(url)}&width=${w}&quality=80`;
  }

  return url;
}

/**
 * Проксирует URL или возвращает null.
 */
export function proxyImageUrlOrNull(
  url: string | null | undefined,
  width?: number,
): string | null {
  if (!url) return null;
  return proxyImageUrl(url, width) || null;
}
