import { createHash } from "node:crypto";
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createLogger } from "../../lib/logger.js";
import { config } from "../../config/env.js";

const logger = createLogger("ImageProxy", { color: "cyan" });

// ── Белый список доменов для прокси ──
const ALLOWED_HOSTS = [
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "i.gr-assets.com",
  "covers.openlibrary.org",
  "s1.livelib.ru",
  "s2.livelib.ru",
  "s3.livelib.ru",
  "s4.livelib.ru",
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
  "books.google.com",
  "googleapis.com",
  "s3.twcstorage.ru",
  "cdn.twcstorage.ru",
  "re406cj9uj.cdn.twcstorage.ru",
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

// ── Разрешённые протоколы ──
const ALLOWED_PROTOCOLS = ["https:", "http:"];

// ── S3 клиент (аналогично s3-storage.ts) ──
const S3_BUCKET = config.S3_BUCKET;
const s3Client = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY_ID!,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false,
});

function publicUrl(key: string): string {
  return `https://${config.S3_PUBLIC_HOST}/${S3_BUCKET}/${key}`;
}

// ── In-memory кэш URL → S3 URL ──
// Сбрасывается при перезапуске сервера — не критично, S3 постоянный
const urlCache = new Map<string, string>();
const CACHE_FOLDER = "image-cache";

/**
 * Проверяет, разрешён ли URL для проксирования.
 */
export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return false;

    const hostname = parsed.hostname.toLowerCase();

    return ALLOWED_HOSTS.some(
      (allowed) => hostname === allowed || hostname.endsWith("." + allowed),
    );
  } catch {
    return false;
  }
}

/**
 * Хэш URL для использования в качестве имени файла на S3.
 */
function urlHash(url: string): string {
  return createHash("md5").update(url).digest("hex");
}

/**
 * S3-ключ для кэшированного изображения.
 */
function cacheKey(hash: string): string {
  return `${CACHE_FOLDER}/${hash}.webp`;
}

/**
 * Проверяет, существует ли объект на S3 по ключу.
 */
async function existsOnS3(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch (err: unknown) {
    // 404 = не найдено, всё остальное — ошибка
    if (
      err instanceof S3ServiceException &&
      (err.name === "NotFound" || err.$metadata.httpStatusCode === 404)
    ) {
      return false;
    }
    // При других ошибках (сеть, нет доступа) — логируем и считаем что не найдено
    logger.warn(
      `S3 HeadObject error for ${key}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return false;
  }
}

/**
 * Загружает сконвертированный buffer на S3.
 */
async function uploadToS3(
  buffer: Buffer,
  key: string,
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/webp",
      ACL: "public-read",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const url = publicUrl(key);
  logger.info(`Uploaded to S3: ${url}`);
  return url;
}

/**
 * Скачивает изображение по URL, конвертирует в WebP.
 */
async function convertToWebP(
  url: string,
  width: number,
  quality: number,
): Promise<Buffer> {
  logger.info(`Fetching: ${url}`);

  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "BookStrata/1.0 ImageProxy",
      Referer: "https://bookstrata.ru",
    },
    signal: AbortSignal.timeout(15_000), // 15 секунд таймаут
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Non-image content type: ${contentType}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  logger.info(
    `Converting: ${url} → WebP (${width}px, q${quality}), source ${(inputBuffer.length / 1024).toFixed(0)} KB`,
  );

  const webpBuffer = await sharp(inputBuffer)
    .resize(width, undefined, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

  logger.info(
    `Converted: ${url} → ${(webpBuffer.length / 1024).toFixed(0)} KB (было ${(inputBuffer.length / 1024).toFixed(0)} KB)`,
  );

  return webpBuffer;
}

/**
 * Получает WebP-изображение для указанного URL.
 * 1. Проверяет in-memory кэш
 * 2. Проверяет S3
 * 3. Если нет — скачивает, конвертирует, сохраняет на S3
 *
 * Возвращает { buffer, s3Url }.
 */
export async function getWebP(
  url: string,
  width: number = 300,
  quality: number = 80,
): Promise<{ buffer: Buffer; s3Url: string | null }> {
  const hash = urlHash(url);
  const key = cacheKey(hash);

  // 1. In-memory кэш
  const cached = urlCache.get(hash);
  if (cached) {
    logger.debug(`Cache HIT (memory): ${url} → ${cached}`);
    // В памяти только URL, нужно вернуть buffer — грузим с S3
    // Но можно просто вернуть URL без buffer (редирект)
    return { buffer: null as unknown as Buffer, s3Url: cached };
  }

  // 2. S3
  const exists = await existsOnS3(key);
  if (exists) {
    const s3Url = publicUrl(key);
    urlCache.set(hash, s3Url);
    logger.debug(`Cache HIT (S3): ${url} → ${s3Url}`);
    return { buffer: null as unknown as Buffer, s3Url };
  }

  // 3. Конвертируем
  logger.info(`Cache MISS: converting ${url}`);
  const webpBuffer = await convertToWebP(url, width, quality);

  // 4. Сохраняем на S3 (fire & forget — не ждём, отдаём buffer сразу)
  const uploadPromise = uploadToS3(webpBuffer, key)
    .then((s3Url) => {
      urlCache.set(hash, s3Url);
      logger.info(`Cached on S3: ${s3Url}`);
    })
    .catch((err) => {
      logger.error(err as Error, { action: "uploadToS3", url });
    });

  // Если S3 upload занял много времени — всё равно отдаём buffer
  // В фоне дождёмся не больше 5 секунд
  await Promise.race([
    uploadPromise,
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);

  return { buffer: webpBuffer, s3Url: null };
}
