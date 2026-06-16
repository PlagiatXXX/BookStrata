/**
 * CDN-прокси для изображений из S3.
 *
 * S3 URL:   https://s3.twcstorage.ru/bookstrata/tiermaker-pro/migrated/xxx.webp
 * CDN URL:  https://re406cj9uj.cdn.twcstorage.ru/tiermaker-pro/migrated/xxx.webp
 *
 * Функция заменяет базовый URL S3 на CDN, чтобы:
 *  - избежать ERR_TIMED_OUT при concurrent запросах к S3
 *  - разгрузить сервер (CDN отдаёт с Edge)
 *  - кешировать на граничных узлах
 */

const S3_BASE = "https://s3.twcstorage.ru/bookstrata";
const CDN_BASE = "https://re406cj9uj.cdn.twcstorage.ru";

/**
 * Заменяет S3 URL на CDN URL.
 * Если URL не с S3 — возвращает как есть.
 */
export function proxyImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith(S3_BASE)) {
    return url.replace(S3_BASE, CDN_BASE);
  }
  return url;
}

/**
 * Заменяет S3 URL на CDN URL для массива или возвращает null.
 */
export function proxyImageUrlOrNull(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (url.startsWith(S3_BASE)) {
    return url.replace(S3_BASE, CDN_BASE);
  }
  return url;
}
