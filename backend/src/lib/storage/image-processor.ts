// backend/src/lib/storage/image-processor.ts
import sharp from "sharp"

/** Максимальная ширина загружаемого изображения (пиксели).
 *  Покрывает все блоки сайта (карточки, статьи, hero) с учётом ретины;
 *  файлы больше не храним — только лишний вес. */
export const MAX_IMAGE_WIDTH = 1600

/** Размер OG-изображения для соцсетей (рекомендация Open Graph: 1200×630). */
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

export interface PreparedImage {
  buffer: Buffer
  contentType: string
}

/**
 * Конвертирует изображение в WebP (q85) и уменьшает до MAX_IMAGE_WIDTH
 * по ширине. Маленькие картинки не увеличиваются. Битый файл возвращается
 * как есть (contentType = image/png) — как и раньше, ошибка не роняет загрузку.
 */
export async function prepareImage(buffer: Buffer): Promise<PreparedImage> {
  try {
    const webp = await sharp(buffer)
      .resize(MAX_IMAGE_WIDTH, undefined, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    return { buffer: webp, contentType: 'image/webp' }
  } catch {
    return { buffer, contentType: 'image/png' }
  }
}

/**
 * Генерирует OG-изображение (1200×630, landscape) для Open Graph / Twitter Cards.
 * Обрезает по центру (cover) с фокусом на attention — Sharp выберет самую
 * «интересную» область. Используется для шаринга книг в соцсетях.
 * Битый файл возвращается как есть (fallback на основное изображение).
 */
export async function prepareOgImage(buffer: Buffer): Promise<PreparedImage> {
  try {
    const webp = await sharp(buffer)
      .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80 })
      .toBuffer()
    return { buffer: webp, contentType: 'image/webp' }
  } catch {
    return { buffer, contentType: 'image/png' }
  }
}
