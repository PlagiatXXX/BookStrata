// backend/src/modules/admin-books/video-processor.service.ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { uploadVideo, uploadBase64WithOg } from '../../lib/upload.js'

const execFileAsync = promisify(execFile)

export class VideoProcessingError extends Error {
  code: string

  constructor(message: string, code = 'VIDEO_PROCESSING_FAILED') {
    super(message)
    this.name = 'VideoProcessingError'
    this.code = code
  }
}

const MAX_VIDEO_BYTES = 35 * 1024 * 1024 // 35 MB

const KNOWN_FFMPEG_PATHS = [
  '/opt/homebrew/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/usr/bin/ffmpeg',
]

export function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH
  }
  for (const p of KNOWN_FFMPEG_PATHS) {
    if (fs.existsSync(p)) {
      return p
    }
  }
  return 'ffmpeg'
}

export interface ProcessedAnimatedCoverResult {
  animatedCoverUrl: string
  coverImageUrl: string
  ogImageUrl?: string
}

export interface ProcessVideoOptions {
  folder?: string
}

/**
 * Обрабатывает видео живой обложки:
 * 1. Сжимает через ffmpeg (H.264, scale 540:-2, CRF 25, no audio, faststart).
 * 2. Извлекает первый кадр и конвертирует в WebP высокого качества (>= 540x862).
 * 3. Загружает видео и постер (с OG-версией) в постоянное хранилище (S3/local).
 */
export async function processAndUploadAnimatedCover(
  videoBuffer: Buffer,
  options: ProcessVideoOptions = {},
): Promise<ProcessedAnimatedCoverResult> {
  if (!videoBuffer || videoBuffer.length === 0) {
    throw new VideoProcessingError('Пустой буфер видео', 'EMPTY_VIDEO')
  }

  if (videoBuffer.length > MAX_VIDEO_BYTES) {
    throw new VideoProcessingError(
      'Размер видео не должен превышать 35 МБ',
      'FILE_TOO_LARGE',
    )
  }

  const folder = options.folder ?? 'tiermaker-pro/book-covers'
  const ffmpegBin = getFfmpegPath()
  const randomId = crypto.randomUUID()
  const tmpDir = os.tmpdir()

  const inputPath = path.join(tmpDir, `bs_live_in_${randomId}.mp4`)
  const outputPath = path.join(tmpDir, `bs_live_out_${randomId}.mp4`)
  const posterPngPath = path.join(tmpDir, `bs_live_poster_${randomId}.png`)

  try {
    // 1. Записываем входное видео во временный файл
    await fsp.writeFile(inputPath, videoBuffer)

    // 2. Сжимаем видео через ffmpeg
    // scale=540:-2 гарантирует четность высоты и ширину 540px
    const compressArgs = [
      '-y',
      '-i',
      inputPath,
      '-vf',
      'scale=540:-2',
      '-c:v',
      'libx264',
      '-crf',
      '25',
      '-preset',
      'slow',
      '-an',
      '-movflags',
      '+faststart',
      outputPath,
    ]

    await execFileAsync(ffmpegBin, compressArgs, { timeout: 60_000 })

    // 3. Извлекаем первый кадр из оптимизированного видео
    const posterArgs = [
      '-y',
      '-ss',
      '00:00:00',
      '-i',
      outputPath,
      '-vframes',
      '1',
      posterPngPath,
    ]

    await execFileAsync(ffmpegBin, posterArgs, { timeout: 30_000 })

    // 4. Читаем постер и конвертируем в четкий WebP
    const posterPngBuffer = await fsp.readFile(posterPngPath)
    const posterWebpBuffer = await sharp(posterPngBuffer)
      .webp({ quality: 85, effort: 4 })
      .toBuffer()

    const posterBase64 = `data:image/webp;base64,${posterWebpBuffer.toString('base64')}`

    // 5. Читаем оптимизированное видео
    const optimizedVideoBuffer = await fsp.readFile(outputPath)

    // 6. Загружаем оба файла в хранилище
    const [videoResult, coverResult] = await Promise.all([
      uploadVideo(optimizedVideoBuffer, folder),
      uploadBase64WithOg(posterBase64, folder),
    ])

    return {
      animatedCoverUrl: videoResult.url,
      coverImageUrl: coverResult.url,
      ogImageUrl: coverResult.ogUrl,
    }
  } catch (error) {
    if (error instanceof VideoProcessingError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new VideoProcessingError(
      `Ошибка обработки видео: ${message}`,
      'VIDEO_PROCESSING_FAILED',
    )
  } finally {
    // Очистка временных файлов
    await Promise.all([
      fsp.unlink(inputPath).catch(() => {}),
      fsp.unlink(outputPath).catch(() => {}),
      fsp.unlink(posterPngPath).catch(() => {}),
    ])
  }
}
