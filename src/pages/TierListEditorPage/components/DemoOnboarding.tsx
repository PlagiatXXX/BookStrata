import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface DemoOnboardingProps {
  step: 0 | 1 | 2 | 3
  onNext: () => void
  onSkip: () => void
  /** Названия тиров текущего тир-листа (по порядку) — для динамического текста шага 2 */
  tierNames?: string[]
}

const STEP_TARGETS = ["unranked", "tiers", "unranked", null] as const

const STEPS = [
  {
    icon: "📚",
    title: "Вот твои книги",
    description:
      "Ты видишь книги без рейтинга. Перетащи их на полки, чтобы распределить по уровням.",
  },
  {
    icon: "🏆",
    title: "Полки для рейтинга",
    description:
      "Каждый уровень — своя полка. Перемещай книги между ними в любой момент.",
  },
  {
    icon: "👆",
    title: "Попробуй перетащить",
    description:
      "Зажми книгу и перетащи на полку. Не бойся ошибиться — порядок всегда можно изменить!",
  },
  {
    icon: "🎯",
    title: "Всё получится!",
    description: "",
  },
] as const

export function DemoOnboarding({ step, onNext, onSkip, tierNames }: DemoOnboardingProps) {
  // При смене шага плавно скроллим к подсвечиваемой области
  useEffect(() => {
    const target = STEP_TARGETS[step]
    if (!target) return
    const el = document.querySelector(`[data-onboarding-target="${target}"]`)
    if (el) {
      // Откладываем на следующий кадр: эффект родителей (AppShell) делает
      // window.scrollTo(0, 0) при смене маршрута, что отменяет плавный скролл.
      const rafId = requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      })
      return () => cancelAnimationFrame(rafId)
    }
  }, [step])
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  // Шаг 2: подставляем реальные названия тиров текущего тир-листа
  const step2Description =
    tierNames && tierNames.length >= 2
      ? `Каждый уровень — своя полка: от «${tierNames[0]}» до «${tierNames[tierNames.length - 1]}». Перемещай книги между ними в любой момент.`
      : current.description
  const description = step === 1 ? step2Description : current.description

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-9999 flex items-center justify-center pointer-events-none"
      >
        {/* Затемнение фона */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/40"
        />

        {/* Тултип */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative pointer-events-auto w-[90vw] max-w-sm
                     bg-(--theme-surface) border-2 border-(--theme-accent-primary) text-(--theme-text)
                     shadow-[4px_4px_0_0_var(--theme-accent-primary)]
                     p-6 rounded-none"
          role="dialog"
          aria-modal="true"
          aria-label={`Шаг ${step + 1}: ${current.title}`}
        >
          {/* Кнопка закрыть */}
          <button
            onClick={onSkip}
            className="absolute top-3 right-3 text-(--theme-text-muted) hover:text-(--theme-text)
                       transition-colors cursor-pointer"
            aria-label="Пропустить обучение"
            type="button"
          >
            <X size={18} />
          </button>

          {/* Иконка + заголовок */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" role="img" aria-hidden="true">
              {current.icon}
            </span>
            <h2 className="text-lg font-bold text-(--theme-accent-primary)">{current.title}</h2>
          </div>

          {/* Описание — обычные шаги */}
          {step < 3 && (
            <p className="text-sm text-(--theme-text-muted) leading-relaxed mb-6">
              {description}
            </p>
          )}

          {/* 4-й шаг — ссылки на соцсети */}
          {step === 3 && (
            <div className="mb-6 space-y-3">
              <p className="text-sm text-(--theme-text-muted) leading-relaxed">
                Подробное обучение по работе с редактором тир-листов смотри в наших соцсетях:
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://t.me/BookStrata"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold
                             bg-(--global-surface-high) border border-(--theme-accent-primary)/30 hover:border-(--theme-accent-primary)
                             text-(--theme-text) transition-colors rounded-none"
                >
                  <span className="text-lg" role="img" aria-hidden="true">✈️</span>
                  Telegram
                </a>
                <a
                  href="https://vk.ru/club237287277"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold
                             bg-(--global-surface-high) border border-(--theme-accent-primary)/30 hover:border-(--theme-accent-primary)
                             text-(--theme-text) transition-colors rounded-none"
                >
                  <span className="text-lg" role="img" aria-hidden="true">📱</span>
                  ВКонтакте
                </a>
                <a
                  href="https://www.youtube.com/@bookstrata"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold
                             bg-(--global-surface-high) border border-(--theme-accent-primary)/30 hover:border-(--theme-accent-primary)
                             text-(--theme-text) transition-colors rounded-none"
                >
                  <span className="text-lg" role="img" aria-hidden="true">▶️</span>
                  YouTube
                </a>
              </div>
            </div>
          )}

          {/* Прогресс + кнопка */}
          <div className="flex items-center justify-between">
            {/* Прогресс-бары */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? "w-6 bg-(--theme-accent-primary)"
                      : i < step
                        ? "w-3 bg-(--theme-accent-primary)/50"
                        : "w-3 bg-(--theme-text-muted)/40"
                  }`}
                />
              ))}
            </div>

            {/* Кнопка */}
            <button
              onClick={onNext}
              className="px-5 py-2 text-sm font-bold text-(--theme-on-accent) bg-(--theme-accent-primary)
                         border-2 border-(--theme-accent-primary)
                         shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]
                         hover:shadow-[1px_1px_0_0_rgba(0,0,0,0.8)]
                         hover:translate-x-px hover:translate-y-px
                         active:shadow-none active:translate-x-0.5 active:translate-y-0.5
                         transition-all duration-100 cursor-pointer"
              type="button"
            >
              {isLast ? "Начать!" : "Далее"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
