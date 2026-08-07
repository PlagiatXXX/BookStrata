// Серверная NSFW-проверка изображений (вариант A).
//
// Модель MobileNetV2 (nsfwjs) грузится лениво и кэшируется на весь процесс:
// tfjs-node и веса подтягиваются только при первом вызове, старт сервера не
// замедляется, а клиенту не нужно скачивать ~3.5 МБ модели в браузер.
//
// Поведение при ошибках — "fail-open": если модель не загрузилась или буфер
// не декодируется (битый файл), загрузку НЕ блокируем — такие файлы всё равно
// отваливаются на этапе конвертации в sharp.

import { createLogger } from './logger.js'
import { config } from '../config/env.js'

const logger = createLogger('NsfwCheck', { color: 'magenta' })

const NSFW_CLASSES = ['Porn', 'Hentai']

export interface NsfwCheckResult {
  isNsfw: boolean
  /** Класс с максимальной вероятностью среди Porn/Hentai */
  className: string | null
  probability: number | null
}

// --- Ленивая загрузка tfjs-node и модели ---

let tfPromise: Promise<typeof import('@tensorflow/tfjs-node')> | null = null

function getTf(): Promise<typeof import('@tensorflow/tfjs-node')> {
  if (!tfPromise) {
    tfPromise = import('@tensorflow/tfjs-node')
  }
  return tfPromise
}

// Минимальный интерфейс модели — не тянем типы nsfwjs в рантайм
interface NsfwModel {
  classify(img: unknown): Promise<{ className: string; probability: number }[]>
}

let modelPromise: Promise<NsfwModel> | null = null

function getModel(): Promise<NsfwModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [, { load }, { MobileNetV2Model }] = await Promise.all([
        getTf(),
        import('nsfwjs/core'),
        import('nsfwjs/models/mobilenet_v2'),
      ])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await load('MobileNetV2', { modelDefinitions: [MobileNetV2Model] })) as any
    })()
    modelPromise.catch(() => {
      modelPromise = null // даём шанс на повторную загрузку после сбоя
    })
  }
  return modelPromise
}

// --- API ---

/** Проверяет буфер изображения. Возвращает результат или null при сбое (safe-open). */
export async function checkImageBuffer(buffer: Buffer): Promise<NsfwCheckResult> {
  if (!config.NSFW_CHECK_ENABLED) {
    return { isNsfw: false, className: null, probability: null }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tensor: any = null
  try {
    const tf = await getTf()
    tensor = tf.node.decodeImage(buffer, 3)
    const model = await getModel()
    const predictions: { className: string; probability: number }[] =
      await model.classify(tensor)

    // Выбираем худший из NSFW-классов
    let worst: { className: string; probability: number } | null = null
    for (const p of predictions) {
      if (NSFW_CLASSES.includes(p.className)) {
        if (!worst || p.probability > worst.probability) worst = p
      }
    }

    if (!worst) {
      return { isNsfw: false, className: null, probability: null }
    }
    return {
      isNsfw: worst.probability > config.NSFW_THRESHOLD,
      className: worst.className,
      probability: worst.probability,
    }
  } catch (error: unknown) {
    // Сбой классификации не должен блокировать заявку (safe-open)
    logger.warn(`NSFW check failed, allowing upload: ${String(error)} (${buffer.length} bytes)`)
    return { isNsfw: false, className: null, probability: null }
  } finally {
    if (tensor?.dispose) {
      tensor.dispose()
    }
  }
}

/** Превращает data-URL изображения в Buffer. */
export function base64DataToBuffer(base64: string): Buffer {
  const raw = base64.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(raw, 'base64')
}

/**
 * Проверяет image по data-URL. Возвращает сообщение об ошибке или null,
 * если изображение можно загружать.
 */
export async function assertImageAllowed(base64: string): Promise<string | null> {
  if (!config.NSFW_CHECK_ENABLED) return null
  const result = await checkImageBuffer(base64DataToBuffer(base64))
  if (!result.isNsfw) return null
  const score = result.probability != null ? ` (${Math.round(result.probability * 100)}%)` : ''
  return `Изображение содержит NSFW-контент${score} и не было загружено`
}