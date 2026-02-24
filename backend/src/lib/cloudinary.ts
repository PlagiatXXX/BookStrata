import { v2 as cloudinary } from 'cloudinary';

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ url: process.env.CLOUDINARY_URL });
} else {
  // Fallback на отдельные переменные
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export interface UploadResult {
  url: string;
  public_id: string;
}

// Загрузить аватар пользователя
export async function uploadAvatar(
  fileBuffer: Buffer,
  userId: number
): Promise<UploadResult> {
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
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        } else {
          reject(new Error('Upload result is undefined'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

// Удалить аватар по public_id
export async function deleteAvatar(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

// Универсальная загрузка (base64)
export async function uploadBase64(
  base64Data: string,
  folder: string = 'tiermaker-pro/uploads'
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(base64Data, {
    folder,
    transformation: [
      { width: 512, height: 512, crop: 'limit' },
      { format: 'webp', quality: 'auto' },
    ],
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
  };
}

// Загрузка по URL
export async function uploadFromUrl(
  url: string,
  folder: string = 'tiermaker-pro/uploads'
): Promise<UploadResult> {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder,
      transformation: [
        { width: 512, height: 512, crop: 'limit' },
        { format: 'webp', quality: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error: unknown) {
    // Если ошибка 429 (Too Many Requests) от внешнего API, возвращаем оригинальный URL
    const errorObj = error as { http_code?: number; message?: string };
    if (errorObj.http_code === 429 || errorObj.message?.includes('429')) {
      console.warn('Rate limit exceeded for external image, using original URL');
      // Генерируем fake public_id для совместимости
      const publicId = `external_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return {
        url: url,
        public_id: publicId,
      };
    }
    throw error;
  }
}
