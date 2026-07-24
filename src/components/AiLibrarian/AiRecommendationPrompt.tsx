import { useState, useCallback } from 'react'
import { Sparkles, X } from 'lucide-react'
import { sileo } from 'sileo'

interface AiRecommendationPromptProps {
  totalBooks: number
  onOpenAiLibrarian: () => void
}

/**
 * Контекстный блок с предложением ИИ-рекомендаций.
 * Показывается один раз за сессию при добавлении 3+ книг в редакторе.
 *
 * — «Посмотреть» → открывает ИИ-библиотекаря, промпт скрывается навсегда.
 * — × → скрывает промпт навсегда + показывает тост «карточка ждёт внизу».
 */
const LS_KEY = 'ai_prompt_dismissed'

export function AiRecommendationPrompt({
  totalBooks,
  onOpenAiLibrarian,
}: AiRecommendationPromptProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return !!localStorage.getItem(LS_KEY)
    } catch {
      return false
    }
  })

  const dismissAndSave = useCallback(() => {
    setDismissed(true)
    try { localStorage.setItem(LS_KEY, '1') } catch { /* localStorage may be unavailable */ }
  }, [])

  const dismissWithToast = useCallback(() => {
    dismissAndSave()
    sileo.success({
      title: 'Букстраж рядом',
      description: 'Если захочешь подобрать книги — карточка ждёт тебя внизу редактора',
    })
  }, [dismissAndSave])

  const handleOpen = useCallback(() => {
    dismissAndSave()
    onOpenAiLibrarian()
  }, [dismissAndSave, onOpenAiLibrarian])

  if (dismissed) return null

  const sourceText = `${totalBooks} ${totalBooks === 1 ? 'книги' : 'книг'}`

  return (
    <div
      className="group relative mx-auto my-4 max-w-3xl overflow-hidden rounded-xl border border-violet-500/20 bg-linear-to-r from-violet-500/5 via-fuchsia-500/5 to-indigo-500/5 px-3 py-3 sm:px-6 sm:py-5"
      role="status"
      aria-live="polite"
    >
      {/* Декоративная полоса слева */}
      <div className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-violet-500 to-fuchsia-500" />

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Иконка */}
        <div className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
          <Sparkles size={16} className="text-violet-400 sm:size-5" />
        </div>

        {/* Текст */}
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-[#e2e8f0]">
            ИИ-библиотекарь подобрал книги по твоему вкусу
          </p>
          <p className="mt-0.5 text-[10px] sm:text-xs leading-relaxed text-[#94a3b8] hidden sm:block">
            На основе {sourceText} Букстраж проанализировал твои предпочтения
            и подобрал книги, которые тебе точно понравятся.
          </p>
        </div>

        {/* Кнопка действия */}
        <button
          type="button"
          onClick={handleOpen}
          className="shrink-0 rounded-lg bg-violet-500/10 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-violet-300 transition-all hover:bg-violet-500/20 hover:text-violet-200 cursor-pointer"
        >
          Посмотреть
        </button>

        {/* Кнопка закрытия */}
        <button
          type="button"
          onClick={dismissWithToast}
          className="shrink-0 rounded-md p-1 text-[#64748b] transition-colors hover:bg-white/5 hover:text-[#94a3b8] cursor-pointer"
          aria-label="Скрыть"
        >
          <X size={14} className="sm:size-4" />
        </button>
      </div>
    </div>
  )
}
