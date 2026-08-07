// Прокси-обёртка над активным хранилищем (STORAGE_PROVIDER=s3|local)
// Новые модули могут импортить напрямую: import { storage } from './storage/index.js'
import { storage } from './storage/index.js'
import type { UploadResult } from './storage/types.js'

export const uploadAvatar = storage.uploadAvatar.bind(storage)
export const deleteAvatar = storage.deleteAvatar.bind(storage)
export const uploadBase64 = storage.uploadBase64.bind(storage)
export const uploadFromUrl = storage.uploadFromUrl.bind(storage)
export type { UploadResult }