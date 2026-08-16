// backend/src/lib/validators.ts
// Хелперы для валидации данных на бэкенде

import sharp from "sharp";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

// ── Проверка удалённых картинок по URL ──

const REMOTE_IMAGE_TIMEOUT_MS = 15_000;
const REMOTE_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB — защита от «тяжёлых» картинок
export const MIN_IMAGE_WIDTH = 400;
export const MIN_IMAGE_HEIGHT = 600;

// Кэш размеров уже проверенных URL (картинка по URL не меняется —
// повторные сохранения не качают её заново)
const remoteImageDimensions = new Map<string, { width: number; height: number }>();

/**
 * Проверяет удалённую картинку по URL: скачивает и читает размеры через sharp.
 * Блокирует слишком маленькие картинки (< minWidth×minHeight) — на сайте
 * они растягиваются и мылятся (обложки книг, коллекций, знаменитостей).
 *
 * Пропускает (возвращает null):
 * - пустые значения и свои/локальные картинки ("/...", "data:", наш CDN) —
 *   они уже прошли проверку при загрузке;
 * - недоступные по сети URL — не блокируем сохранение (migrateUrlToCdn
 *   всё равно вернёт исходный URL, а не сломает запрос).
 *
 * @returns null, если картинка в порядке или её нельзя проверить,
 *   либо строку с текстом ошибки.
 */
export async function validateRemoteImageDimensions(
  url: string,
  minWidth = MIN_IMAGE_WIDTH,
  minHeight = MIN_IMAGE_HEIGHT,
): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Свои/локальные — пропускаем
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:") ||
    trimmed.includes("cdn.twcstorage.ru") ||
    trimmed.includes("s3.twcstorage.ru")
  ) {
    return null;
  }
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) return null;

  const cached = remoteImageDimensions.get(trimmed);
  if (cached) {
    return cached.width < minWidth || cached.height < minHeight
      ? `Картинка слишком маленькая (${cached.width}×${cached.height}). Минимум ${minWidth}×${minHeight}`
      : null;
  }

  let response: Response;
  try {
    response = await fetch(trimmed, {
      redirect: "follow",
      headers: { "User-Agent": "BookStrata/1.0 ImageValidator" },
      signal: AbortSignal.timeout(REMOTE_IMAGE_TIMEOUT_MS),
    });
  } catch {
    return null; // сеть недоступна — не блокируем сохранение
  }

  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > REMOTE_IMAGE_MAX_BYTES) return null;

  try {
    const meta = await sharp(buffer).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width === 0 || height === 0) return null;

    remoteImageDimensions.set(trimmed, { width, height });

    if (width < minWidth || height < minHeight) {
      return `Картинка слишком маленькая (${width}×${height}). Минимум ${minWidth}×${minHeight}`;
    }
    return null;
  } catch {
    return null; // битый файл / не картинка — не блокируем
  }
}

/**
 * Проверяет, что base64 data URL изображения не превышает лимит по размеру.
 * Возвращает null, если размер в норме, или строку с ошибкой.
 *
 * @param dataUrl - data URL вида "data:image/png;base64,..."
 * @param maxSize - максимальный размер в байтах (по умолчанию 5MB)
 */
export function validateImageSize(
  dataUrl: string,
  maxSize = MAX_IMAGE_SIZE,
): string | null {
  if (!dataUrl.startsWith("data:")) return null; // не base64 — пропускаем

  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return "Некорректный data URL";

  const base64Data = dataUrl.slice(commaIndex + 1);
  if (!base64Data) return "Некорректный data URL";

  // Декодированный размер ≈ (длина base64) * 3/4, минус padding
  const padding = base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0;
  const decodedSize = Math.ceil((base64Data.length * 3) / 4 - padding);

  if (decodedSize > maxSize) {
    const mb = (maxSize / 1024 / 1024).toFixed(0);
    return `Размер изображения превышает лимит ${mb}MB`;
  }

  return null;
}
