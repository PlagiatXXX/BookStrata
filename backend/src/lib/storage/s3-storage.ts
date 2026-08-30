import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import crypto from 'node:crypto'
import type { ImageStorageService, UploadResult, UploadWithOgResult } from './types.js'
import { prepareImage, prepareOgImage } from './image-processor.js'
import { config } from '../../config/env.js'
import { createLogger } from '../logger.js'

const logger = createLogger('S3Storage', { color: 'yellow' })

const S3_BUCKET = config.S3_BUCKET
if (!S3_BUCKET) {
  throw new Error('S3_BUCKET environment variable is required for S3 storage')
}

const S3_ENDPOINT = config.S3_ENDPOINT
const S3_REGION = config.S3_REGION
const S3_ACCESS_KEY_ID = config.S3_ACCESS_KEY_ID
const S3_SECRET_ACCESS_KEY = config.S3_SECRET_ACCESS_KEY
const S3_PUBLIC_HOST = config.S3_PUBLIC_HOST

const client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: false,
})

function publicUrl(key: string): string {
  return `https://${S3_PUBLIC_HOST}/${S3_BUCKET}/${key}`
}

function generateKey(folder: string, ext: string): string {
  const id = crypto.randomUUID()
  return `${folder.replace(/\/$/, '')}/${id}.${ext}`
}

async function uploadBuffer(
  buffer: Buffer,
  folder: string,
  contentType: string,
): Promise<UploadResult> {
  const ext = contentType.split('/')[1] || 'bin'
  const key = generateKey(folder, ext)

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  })

  await client.send(command)

  return {
    url: publicUrl(key),
    publicId: key,
  }
}

function bufferFromBase64(base64: string): Buffer {
  const raw = base64.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(raw, 'base64')
}

async function fetchToBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const contentType = response.headers.get('content-type') || 'image/png'
  return { buffer, contentType }
}

export class S3Storage implements ImageStorageService {
  async uploadAvatar(fileBuffer: Buffer, _userId: number): Promise<UploadResult> {
    const resized = await sharp(fileBuffer)
      .resize(256, 256, { fit: 'cover', position: 'attention' })
      .webp()
      .toBuffer()

    return uploadBuffer(resized, 'tiermaker-pro/avatars', 'image/webp')
  }

  async deleteAvatar(publicId: string): Promise<void> {
    await this.deleteFile(publicId)
  }

  /** Удаляет объект по key (или key, извлечённому из нашего URL). */
  async deleteFile(publicId: string): Promise<void> {
    let key = publicId
    if (publicId.startsWith('http')) {
      try {
        const parsed = new URL(publicId)
        key = parsed.pathname.replace(/^\//, '')
        // S3-URL вида {host}/{bucket}/{key} — срезаем имя бакета
        if (key.startsWith(`${S3_BUCKET!}/`)) {
          key = key.slice(S3_BUCKET!.length + 1)
        }
      } catch {
        logger.warn(`deleteFile: не удалось разобрать URL "${publicId}"`)
        return
      }
    }
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
    await client.send(command)
  }

  async uploadBase64(base64Data: string, folder = 'tiermaker-pro/uploads'): Promise<UploadResult> {
    const buffer = bufferFromBase64(base64Data)

    const { buffer: bufferToUpload, contentType } = await prepareImage(buffer)

    return uploadBuffer(bufferToUpload, folder, contentType)
  }

  async uploadFromUrl(url: string, folder = 'tiermaker-pro/uploads'): Promise<UploadResult> {
    const { buffer, contentType } = await fetchToBuffer(url)

    const { buffer: bufferToUpload, contentType: finalContentType } = await prepareImage(buffer)

    return uploadBuffer(bufferToUpload, folder, finalContentType ?? contentType)
  }

  async uploadBase64WithOg(base64Data: string, folder = 'tiermaker-pro/uploads'): Promise<UploadWithOgResult> {
    const buffer = bufferFromBase64(base64Data)

    const { buffer: mainBuffer, contentType } = await prepareImage(buffer)
    const { buffer: ogBuffer } = await prepareOgImage(buffer)

    const mainResult = await uploadBuffer(mainBuffer, folder, contentType)
    const ogResult = await uploadBuffer(ogBuffer, folder, 'image/webp')

    return { ...mainResult, ogUrl: ogResult.url }
  }

  async uploadFromUrlWithOg(url: string, folder = 'tiermaker-pro/uploads'): Promise<UploadWithOgResult> {
    const { buffer, contentType } = await fetchToBuffer(url)

    const { buffer: mainBuffer, contentType: mainContentType } = await prepareImage(buffer)
    const { buffer: ogBuffer } = await prepareOgImage(buffer)

    const mainResult = await uploadBuffer(mainBuffer, folder, mainContentType ?? contentType)
    const ogResult = await uploadBuffer(ogBuffer, folder, 'image/webp')

    return { ...mainResult, ogUrl: ogResult.url }
  }
}
