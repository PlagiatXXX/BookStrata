import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import sharp from 'sharp'
import crypto from 'node:crypto'
import type { ImageStorageService, UploadResult } from './types.js'

const YC_BUCKET = process.env.YC_BUCKET
if (!YC_BUCKET) {
  throw new Error('YC_BUCKET environment variable is required for Yandex Object Storage')
}

const YC_ENDPOINT = process.env.YC_ENDPOINT || 'https://storage.yandexcloud.net'
const YC_REGION = process.env.YC_REGION || 'ru-central1'
const YC_ACCESS_KEY_ID = process.env.YC_ACCESS_KEY_ID || ''
const YC_SECRET_ACCESS_KEY = process.env.YC_SECRET_ACCESS_KEY || ''
const YC_PUBLIC_HOST = process.env.YC_PUBLIC_HOST || 'storage.yandexcloud.net'

const client = new S3Client({
  endpoint: YC_ENDPOINT,
  region: YC_REGION,
  credentials: {
    accessKeyId: YC_ACCESS_KEY_ID,
    secretAccessKey: YC_SECRET_ACCESS_KEY,
  },
  forcePathStyle: false,
})

function publicUrl(key: string): string {
  return `https://${YC_PUBLIC_HOST}/${key}`
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
    Bucket: YC_BUCKET,
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

export class YandexStorage implements ImageStorageService {
  async uploadAvatar(fileBuffer: Buffer, _userId: number): Promise<UploadResult> {
    const resized = await sharp(fileBuffer)
      .resize(256, 256, { fit: 'cover', position: 'attention' })
      .webp()
      .toBuffer()

    return uploadBuffer(resized, 'tiermaker-pro/avatars', 'image/webp')
  }

  async deleteAvatar(publicId: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: YC_BUCKET,
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
