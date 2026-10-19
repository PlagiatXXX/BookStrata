// backend/src/lib/media-url.ts
// Единая точка формирования публичного URL файла из нашего хранилища.
// Раздача идёт через собственный домен (bookstrata.ru/img), который
// доступен глобально, в отличие от raw-S3-хоста.
import { config } from "../config/env.js";

/** Публичный URL файла из нашего хранилища (раздаётся через собственный домен). */
export function mediaUrl(key: string): string {
  return `${config.MEDIA_PUBLIC_URL}/${key.replace(/^\//, "")}`;
}
