import type { ImageStorageService, UploadResult } from './types.js'
import { CloudinaryStorage } from './cloudinary-storage.js'
import { createLogger } from '../logger.js'

export type { ImageStorageService, UploadResult }

const logger = createLogger('Storage', { color: 'yellow' })

const provider = process.env.STORAGE_PROVIDER || 'cloudinary'

let storage: ImageStorageService

switch (provider) {
  case 'yandex': {
    logger.info('Using Yandex Object Storage')
    const { YandexStorage } = await import('./yandex-storage.js')
    storage = new YandexStorage()
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
