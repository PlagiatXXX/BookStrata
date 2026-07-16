import sharp from 'sharp'
import crypto from 'node:crypto'
import { access, mkdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { ImageStorageService, UploadResult } from './types.js'
import { config } from '../../config/env.js'

const UPLOADS_DIR = config.UPLOADS_DIR
  ? join(process.cwd(), config.UPLOADS_DIR)
  : join(process.cwd(), 'uploads')

const BASE_URL = config.UPLOADS_BASE_URL

async function ensureDir(dir: string): Promise<void> {
  try {
    await access(dir)
  } catch {
    await mkdir(dir, { recursive: true })
  }
}

function generateFileName(ext: string): string {
  const id = crypto.randomUUID()
  return `${id}.${ext}`
}

async function writeFile(buffer: Buffer, folder: string, ext: string): Promise<UploadResult> {
  const dir = join(UPLOADS_DIR, folder)
  await ensureDir(dir)

  const fileName = generateFileName(ext)
  const filePath = join(dir, fileName)

  await sharp(buffer).toFile(filePath)

  return {
    url: `${BASE_URL}/${folder}/${fileName}`,
    publicId: `/uploads/${folder}/${fileName}`,
  }
}

function bufferFromBase64(base64: string): Buffer {
  const raw = base64.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(raw, 'base64')
}

async function fetchToBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

const AVATARS_DIR = 'avatars'
const UPLOADS_SUBDIR = 'uploads'

export class LocalStorage implements ImageStorageService {
  async uploadAvatar(fileBuffer: Buffer, _userId: number): Promise<UploadResult> {
    const webp = await sharp(fileBuffer)
      .resize(256, 256, { fit: 'cover', position: 'attention' })
      .webp()
      .toBuffer()

    return writeFile(webp, AVATARS_DIR, 'webp')
  }

  async deleteAvatar(publicId: string): Promise<void> {
    // publicId = /uploads/avatars/uuid.webp — убираем /uploads, получаем путь от UPLOADS_DIR
    const relativePath = publicId.replace(/^\/uploads\//, '')
    const filePath = join(UPLOADS_DIR, relativePath)
    try {
      await unlink(filePath)
    } catch {
      // файла нет — не ошибка
    }
  }

  async uploadBase64(base64Data: string, folder = UPLOADS_SUBDIR): Promise<UploadResult> {
    const buffer = bufferFromBase64(base64Data)

    let bufferToWrite: Buffer
    let ext: string
    try {
      const webp = await sharp(buffer).webp({ quality: 85 }).toBuffer()
      bufferToWrite = webp
      ext = 'webp'
    } catch {
      bufferToWrite = buffer
      ext = 'png'
    }

    return writeFile(bufferToWrite, folder, ext)
  }

  async uploadFromUrl(url: string, folder = UPLOADS_SUBDIR): Promise<UploadResult> {
    const buffer = await fetchToBuffer(url)

    let bufferToWrite: Buffer
    let ext: string
    try {
      const webp = await sharp(buffer).webp({ quality: 85 }).toBuffer()
      bufferToWrite = webp
      ext = 'webp'
    } catch {
      bufferToWrite = buffer
      ext = 'png'
    }

    return writeFile(bufferToWrite, folder, ext)
  }
}
