import { ShieldCheck, Loader2 } from "lucide-react"

interface NsfwWarningProps {
  isChecking: boolean
  isNsfw: boolean
  predictions?: Array<{ className: string; probability: number }>
  onOverride: () => void
  onDismiss: () => void
}

export function NsfwWarning({
  isChecking,
  isNsfw,
  predictions,
  onOverride,
  onDismiss,
}: NsfwWarningProps) {
  if (isChecking) {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <Loader2 size={18} className="text-blue-400 animate-spin shrink-0" />
        <p className="text-sm text-blue-300">Проверяем изображение...</p>
      </div>
    )
  }

  if (!isNsfw) return null

  const top = predictions?.filter((p) => p.probability > 0.1).sort((a, b) => b.probability - a.probability)

  return (
    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
      <div className="flex items-start gap-2">
        <img src="/lap.webp" alt="" className="size-5 object-contain shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-300">
            Обнаружен контент 18+!
          </p>
          <p className="text-xs text-red-400/80 mt-1">
            Букстраж определил, что изображение может содержать неприемлемый контент.
            Модераторы проверят Ваше изображение и в случае нарушения удалят.
          </p>
        </div>
      </div>

      {top && top.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {top.map((p) => (
            <span
              key={p.className}
              className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300"
            >
              {p.className}: {(p.probability * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onOverride}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors cursor-pointer"
        >
          <ShieldCheck size={14} />
          Продолжить
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 text-xs font-medium bg-slate-700/50 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
        >
          Отменить
        </button>
      </div>
    </div>
  )
}
