import { v2 as cloudinary } from 'cloudinary'
import type { ImageStorageService, UploadResult } from './types.js'

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ url: process.env.CLOUDINARY_URL })
} else {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set')
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })
}

function optimizeUrl(url: string): string {
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', '/upload/f_auto,q_auto/')
}

export class CloudinaryStorage implements ImageStorageService {
  async uploadAvatar(fileBuffer: Buffer, userId: number): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'tiermaker-pro/avatars',
          public_id: `user_${userId}_${Date.now()}`,
          transformation: [
            { width: 256, height: 256, crop: 'fill', gravity: 'face' },
            { format: 'webp' },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            })
          } else {
            reject(new Error('Upload result is undefined'))
          }
        },
      )

      uploadStream.end(fileBuffer)
    })
  }

  async deleteAvatar(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId)
  }

  async uploadBase64(base64Data: string, folder = 'tiermaker-pro/uploads'): Promise<UploadResult> {
    const result = await cloudinary.uploader.upload(base64Data, { folder })

    return {
      url: optimizeUrl(result.secure_url),
      publicId: result.public_id,
    }
  }

  async uploadFromUrl(url: string, folder = 'tiermaker-pro/uploads'): Promise<UploadResult> {
    const result = await cloudinary.uploader.upload(url, { folder })

    return {
      url: optimizeUrl(result.secure_url),
      publicId: result.public_id,
    }
  }
}
