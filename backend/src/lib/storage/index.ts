import type { ImageStorageService, UploadResult } from './types.js'
import { CloudinaryStorage } from './cloudinary-storage.js'
import { createLogger } from '../logger.js'

export type { ImageStorageService, UploadResult }

const logger = createLogger('Storage', { color: 'yellow' })

const provider = process.env.STORAGE_PROVIDER || 'cloudinary'

let storage: ImageStorageService

switch (provider) {
  case 's3':
  case 'yandex': {
    logger.info('Using S3-compatible storage')
    const { S3Storage } = await import('./s3-storage.js')
    storage = new S3Storage()
    break
  }
  case 'local': {
    logger.info('Using local filesystem storage')
    const { LocalStorage } = await import('./local-storage.js')
    storage = new LocalStorage()
    break
  }
  case 'cloudinary':
  default: {
    logger.info('Using Cloudinary storage')
    storage = new CloudinaryStorage()
    break
  }
}

export { storage }

// Дефолтный экспорт для обратной совместимости
export default storage
