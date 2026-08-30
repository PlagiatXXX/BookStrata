export interface UploadResult {
  url: string
  publicId: string
}

/** Результат загрузки с OG-изображением (1200×630) для соцсетей. */
export interface UploadWithOgResult extends UploadResult {
  ogUrl: string
}

export interface ImageStorageService {
  uploadAvatar(fileBuffer: Buffer, userId: number): Promise<UploadResult>
  deleteAvatar(publicId: string): Promise<void>
  uploadBase64(base64Data: string, folder?: string): Promise<UploadResult>
  uploadFromUrl(url: string, folder?: string): Promise<UploadResult>
  /** Загрузка base64 с OG-вариантом (1200×630) для обложек книг. */
  uploadBase64WithOg(base64Data: string, folder?: string): Promise<UploadWithOgResult>
  /** Загрузка по URL с OG-вариантом (1200×630) для обложек книг. */
  uploadFromUrlWithOg(url: string, folder?: string): Promise<UploadWithOgResult>
  /** Удаляет файл по key (S3) или publicId/URL (/uploads/... для local). */
  deleteFile(publicId: string): Promise<void>
}
