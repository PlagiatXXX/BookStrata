import { useCallback, useRef } from "react"

export interface NsfwPrediction {
  className: string
  probability: number
}

export interface NsfwResult {
  isNsfw: boolean
  predictions: NsfwPrediction[]
}

const NSFW_THRESHOLD = 0.8
const NSFW_CLASSES = ["Porn", "Hentai"]

export function useNsfwCheck() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadPromiseRef = useRef<Promise<any> | null>(null)

  const loadModel = useCallback(async () => {
    if (modelRef.current) return modelRef.current

    if (!loadPromiseRef.current) {
      loadPromiseRef.current = (async () => {
        const [tf, , nsfw] = await Promise.all([
          import("@tensorflow/tfjs-core"),
          import("@tensorflow/tfjs-backend-webgl"),
          import("nsfwjs"),
        ])

        await tf.setBackend("webgl").catch(() => tf.setBackend("cpu"))

        const model = await nsfw.load()
        modelRef.current = model
        return model
      })()
    }

    return loadPromiseRef.current
  }, [])

  const checkImage = useCallback(
    async (file: File): Promise<NsfwResult> => {
      const model = await loadModel()
      const img = await fileToImage(file)
      const predictions: NsfwPrediction[] = await model.classify(img)

      return {
        isNsfw: predictions.some(
          (p) => NSFW_CLASSES.includes(p.className) && p.probability > NSFW_THRESHOLD,
        ),
        predictions,
      }
    },
    [loadModel],
  )

  const checkBase64 = useCallback(
    async (base64: string): Promise<NsfwResult> => {
      const model = await loadModel()
      const img = await base64ToImage(base64)
      const predictions: NsfwPrediction[] = await model.classify(img)

      return {
        isNsfw: predictions.some(
          (p) => NSFW_CLASSES.includes(p.className) && p.probability > NSFW_THRESHOLD,
        ),
        predictions,
      }
    },
    [loadModel],
  )

  return { checkImage, checkBase64, loadModel }
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }
    img.src = url
  })
}

function base64ToImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = base64
  })
}
