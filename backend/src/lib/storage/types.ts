export interface UploadResult {
  url: string
  publicId: string
}

export interface ImageStorageService {
  uploadAvatar(fileBuffer: Buffer, userId: number): Promise<UploadResult>
  deleteAvatar(publicId: string): Promise<void>
  uploadBase64(base64Data: string, folder?: string): Promise<UploadResult>
  uploadFromUrl(url: string, folder?: string): Promise<UploadResult>
  /** Удаляет файл по key (S3) или publicId/URL (/uploads/... для local). */
  deleteFile(publicId: string): Promise<void>
}
