// backend/src/lib/storage/image-processor.ts
import sharp from "sharp"

/** Максимальная ширина загружаемого изображения (пиксели).
 *  Покрывает все блоки сайта (карточки, статьи, hero) с учётом ретины;
 *  файлы больше не храним — только лишний вес. */
export const MAX_IMAGE_WIDTH = 1600

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
      .webp({ quality: 85 })
      .toBuffer()
    return { buffer: webp, contentType: 'image/webp' }
  } catch {
    return { buffer, contentType: 'image/png' }
  }
}
