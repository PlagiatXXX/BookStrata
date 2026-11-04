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

export type CropPosition = 'center' | 'left' | 'right'
export type VideoProcessingMode = 'crop' | 'fit-blur' | 'original'
export type VideoAspectRatio = '2:3' | 'fit-blur' | 'original'

export interface ProcessVideoOptions {
  folder?: string
  mode?: VideoProcessingMode
  cropOffset?: number // 0..100 (%)
  cropPosition?: CropPosition
  aspectRatio?: VideoAspectRatio
}

export function buildFfmpegFilterArgs(options: ProcessVideoOptions = {}): string[] {
  const mode =
    options.mode ??
    (options.aspectRatio === 'fit-blur'
      ? 'fit-blur'
      : options.aspectRatio === 'original'
        ? 'original'
        : 'crop')

  if (mode === 'original') {
    return ['-vf', 'scale=540:-2']
  }

  if (mode === 'fit-blur') {
    return [
      '-filter_complex',
      '[0:v]scale=540:810:force_original_aspect_ratio=increase,crop=540:810,boxblur=20:5[bg];[0:v]scale=540:810:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1',
    ]
  }

  // mode === 'crop' (книжный формат 2:3, 540x810 px)
  let cropX = '(in_w-540)/2'
  if (options.cropOffset !== undefined) {
    const fraction = Math.max(0, Math.min(100, options.cropOffset)) / 100
    cropX = `(in_w-540)*${fraction}`
  } else if (options.cropPosition === 'left') {
    cropX = '0'
  } else if (options.cropPosition === 'right') {
    cropX = '(in_w-540)'
  }

  const cropY = '(in_h-810)/2'
  return [
    '-vf',
    `scale=540:810:force_original_aspect_ratio=increase,crop=540:810:${cropX}:${cropY},setsar=1`,
  ]
}

export function buildFfmpegVideoFilter(
  aspectRatio: VideoAspectRatio = '2:3',
  cropPosition: CropPosition = 'center',
): string {
  const args = buildFfmpegFilterArgs({ aspectRatio, cropPosition })
  return args[1] ?? 'scale=540:-2'
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

    // 2. Сжимаем видео через ffmpeg с кадрированием под пропорцию 2:3
    const filterArgs = buildFfmpegFilterArgs(options)

    const compressArgs = [
      '-y',
      '-i',
      inputPath,
      ...filterArgs,
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
