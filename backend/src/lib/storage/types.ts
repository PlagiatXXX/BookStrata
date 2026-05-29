export interface UploadResult {
  url: string
  publicId: string
}

export interface ImageStorageService {
  uploadAvatar(fileBuffer: Buffer, userId: number): Promise<UploadResult>
  deleteAvatar(publicId: string): Promise<void>
  uploadBase64(base64Data: string, folder?: string): Promise<UploadResult>
  uploadFromUrl(url: string, folder?: string): Promise<UploadResult>
}
