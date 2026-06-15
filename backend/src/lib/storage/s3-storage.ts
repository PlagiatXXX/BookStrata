import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import sharp from 'sharp'
import crypto from 'node:crypto'
import type { ImageStorageService, UploadResult } from './types.js'

const S3_BUCKET = process.env.S3_BUCKET
if (!S3_BUCKET) {
  throw new Error('S3_BUCKET environment variable is required for S3 storage')
}

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://storage.yandexcloud.net'
const S3_REGION = process.env.S3_REGION || 'ru-central1'
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || ''
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || ''
const S3_PUBLIC_HOST = process.env.S3_PUBLIC_HOST || 'storage.yandexcloud.net'

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
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: publicId,
    })
    await client.send(command)
  }

  async uploadBase64(base64Data: string, folder = 'tiermaker-pro/uploads'): Promise<UploadResult> {
    const buffer = bufferFromBase64(base64Data)

    let bufferToUpload: Buffer
    let contentType: string
    try {
      const webp = await sharp(buffer).webp({ quality: 85 }).toBuffer()
      bufferToUpload = webp
      contentType = 'image/webp'
    } catch {
      bufferToUpload = buffer
      contentType = 'image/png'
    }

    return uploadBuffer(bufferToUpload, folder, contentType)
  }

  async uploadFromUrl(url: string, folder = 'tiermaker-pro/uploads'): Promise<UploadResult> {
    const { buffer, contentType } = await fetchToBuffer(url)

    let bufferToUpload: Buffer
    let finalContentType: string
    try {
      const webp = await sharp(buffer).webp({ quality: 85 }).toBuffer()
      bufferToUpload = webp
      finalContentType = 'image/webp'
    } catch {
      bufferToUpload = buffer
      finalContentType = contentType
    }

    return uploadBuffer(bufferToUpload, folder, finalContentType)
  }
}
