// backend/src/lib/media-url-rewrite.ts
// Переписывание URL медиа из хранилища на собственный домен.
// Нужно для разовой миграции данных: в БД остались URL старых хостов
// (raw-S3 и CDN), после отказа от CDN они должны указывать на
// {MEDIA_PUBLIC_URL} — иначе клиенты ходят в мёртвый/недоступный хост.
import { config } from "../config/env.js";

// Исторические адреса бакета. Хардкод: это уже отгруженные в БД значения,
// они не меняются от окружения.
const LEGACY_PREFIXES = [
  "https://s3.twcstorage.ru/bookstrata/",
  "https://re406cj9uj.cdn.twcstorage.ru/",
];

/** Переписывает URL на {MEDIA_PUBLIC_URL}; всё остальное возвращает как есть. */
export function rewriteMediaUrl(url: string): string {
  for (const prefix of LEGACY_PREFIXES) {
    if (!url.startsWith(prefix)) continue;
    const key = url.slice(prefix.length);
    // Только «чистые» URL: в JSON-снимках рядом с обложками лежат описания,
    // и строка с URL внутри — это текст, а не ссылка на файл.
    if (!key || /\s/.test(key)) continue;
    return `${config.MEDIA_PUBLIC_URL}/${key}`;
  }
  return url;
}

/**
 * Рекурсивно переписывает URL во вложенной JSON-структуре.
 * Возвращает новое значение и число изменённых строк.
 */
export function rewriteMediaUrlsInJson(value: unknown): [unknown, number] {
  if (typeof value === "string") {
    const next = rewriteMediaUrl(value);
    return [next, next === value ? 0 : 1];
  }

  if (Array.isArray(value)) {
    let changed = 0;
    const out = value.map((item) => {
      const [next, count] = rewriteMediaUrlsInJson(item);
      changed += count;
      return next;
    });
    return [out, changed];
  }

  if (value && typeof value === "object") {
    let changed = 0;
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const [next, count] = rewriteMediaUrlsInJson(item);
      changed += count;
      out[key] = next;
    }
    return [out, changed];
  }

  return [value, 0];
}
