// backend/src/modules/admin-books/video-processor.service.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  processAndUploadAnimatedCover,
  getFfmpegPath,
  VideoProcessingError,
} from './video-processor.service.js'

const mocks = vi.hoisted(() => ({
  uploadVideo: vi.fn(),
  uploadBase64WithOg: vi.fn(),
  execFile: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
  existsSync: vi.fn(),
}))

vi.mock('../../lib/upload.js', () => ({
  uploadVideo: mocks.uploadVideo,
  uploadBase64WithOg: mocks.uploadBase64WithOg,
}))

vi.mock('node:fs/promises', () => {
  const fspObj = {
    writeFile: (path: string, data: any) => mocks.writeFile(path, data),
    readFile: (path: string) => mocks.readFile(path),
    unlink: (path: string) => mocks.unlink(path),
  }
  return {
    default: fspObj,
    ...fspObj,
  }
})

vi.mock('node:fs', () => ({
  default: {
    existsSync: (path: string) => mocks.existsSync(path),
  },
  existsSync: (path: string) => mocks.existsSync(path),
}))

vi.mock('node:child_process', () => ({
  execFile: (
    cmd: string,
    args: string[],
    optionsOrCallback: any,
    maybeCallback?: any,
  ) => {
    mocks.execFile(cmd, args)
    const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback
    if (cb) cb(null, '', '')
  },
}))

vi.mock('sharp', () => {
  const sharpInstance = {
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-webp-poster')),
    metadata: vi.fn().mockResolvedValue({ width: 540, height: 862 }),
  }
  return {
    default: vi.fn(() => sharpInstance),
  }
})

describe('video-processor.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.existsSync.mockReturnValue(true)
    mocks.writeFile.mockResolvedValue(undefined)
    mocks.unlink.mockResolvedValue(undefined)
    mocks.readFile.mockImplementation(async (path: string) => {
      if (path.includes('poster.png')) return Buffer.from('mock-poster-png')
      return Buffer.from('mock-optimized-mp4')
    })
    mocks.uploadVideo.mockResolvedValue({
      url: 'https://cdn.bookstrata.ru/tiermaker-pro/book-covers/video.mp4',
      publicId: 'tiermaker-pro/book-covers/video.mp4',
    })
    mocks.uploadBase64WithOg.mockResolvedValue({
      url: 'https://cdn.bookstrata.ru/tiermaker-pro/book-covers/poster.webp',
      ogUrl: 'https://cdn.bookstrata.ru/tiermaker-pro/book-covers/poster-og.webp',
      publicId: 'tiermaker-pro/book-covers/poster.webp',
    })
  })

  it('выбрасывает ошибку, если буфер пустой', async () => {
    await expect(processAndUploadAnimatedCover(Buffer.alloc(0))).rejects.toThrow(
      VideoProcessingError,
    )
  })

  it('выбрасывает ошибку, если размер превышает 35 МБ', async () => {
    const hugeBuffer = Buffer.alloc(36 * 1024 * 1024)
    await expect(processAndUploadAnimatedCover(hugeBuffer)).rejects.toThrow(
      'Размер видео не должен превышать 35 МБ',
    )
  })

  it('успешно сжимает видео через ffmpeg, извлекает постер и загружает в storage', async () => {
    const inputBuffer = Buffer.from('fake-video-content')
    const result = await processAndUploadAnimatedCover(inputBuffer)

    expect(result).toEqual({
      animatedCoverUrl: 'https://cdn.bookstrata.ru/tiermaker-pro/book-covers/video.mp4',
      coverImageUrl: 'https://cdn.bookstrata.ru/tiermaker-pro/book-covers/poster.webp',
      ogImageUrl: 'https://cdn.bookstrata.ru/tiermaker-pro/book-covers/poster-og.webp',
    })

    // Проверяем вызовы ffmpeg
    expect(mocks.execFile).toHaveBeenCalledTimes(2)

    // Первый вызов: сжатие видео (540:-2, crf 25, -an, faststart)
    const firstCallArgs = mocks.execFile.mock.calls[0][1] as string[]
    expect(firstCallArgs).toContain('scale=540:-2')
    expect(firstCallArgs).toContain('libx264')
    expect(firstCallArgs).toContain('25')
    expect(firstCallArgs).toContain('-an')
    expect(firstCallArgs).toContain('+faststart')

    // Второй вызов: извлечение первого кадра
    const secondCallArgs = mocks.execFile.mock.calls[1][1] as string[]
    expect(secondCallArgs).toContain('-ss')
    expect(secondCallArgs).toContain('00:00:00')
    expect(secondCallArgs).toContain('-vframes')
    expect(secondCallArgs).toContain('1')

    // Проверяем удаление временных файлов
    expect(mocks.unlink).toHaveBeenCalled()
  })

  it('выбрасывает понятную ошибку, если ffmpeg завершился с ошибкой', async () => {
    // Подменяем вызов execFile на ошибку
    mocks.execFile.mockImplementationOnce(() => {
      throw new Error('ffmpeg failed to decode input stream')
    })

    await expect(
      processAndUploadAnimatedCover(Buffer.from('corrupt-video')),
    ).rejects.toThrow('Ошибка обработки видео')
  })

  it('находит путь к ffmpeg', () => {
    const ffmpegPath = getFfmpegPath()
    expect(typeof ffmpegPath).toBe('string')
    expect(ffmpegPath.length).toBeGreaterThan(0)
  })
})
