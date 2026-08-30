import type { ImageStorageService, UploadResult, UploadWithOgResult } from './types.js'
import { createLogger } from '../logger.js'
import { config } from '../../config/env.js'

export type { ImageStorageService, UploadResult, UploadWithOgResult }

const logger = createLogger('Storage', { color: 'yellow' })

const provider = config.STORAGE_PROVIDER

let storage: ImageStorageService

switch (provider) {
  case 's3': {
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
  default: {
    logger.error(
      `Unknown STORAGE_PROVIDER="${provider}", falling back to S3 storage`,
    )
    const { S3Storage } = await import('./s3-storage.js')
    storage = new S3Storage()
  }
}

export { storage }

// Дефолтный экспорт для обратной совместимости
export default storage
