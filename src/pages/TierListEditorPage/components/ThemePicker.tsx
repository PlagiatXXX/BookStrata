import { useState, useRef, useEffect, useCallback, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { sileo } from "sileo"
import { apiClient } from "@/lib/api-client"
import {
  type TierListTheme,
  THEME_LABELS,
  THEME_COLORS,
} from "@/lib/tierListApi"

interface ThemePickerProps {
  tierListId: string
  currentTheme: string
  onThemeChanged: (theme: string) => void
}

// Стили — кардинально меняют оформление редактора
const STYLE_THEMES: TierListTheme[] = [
  "default",
  "dark-academia",
  "pixel",
  "vintage",
  "y2k",
  "clay",
  "soft",
]

// Цветовые темы — только палитра на базе классического стиля
const COLOR_THEMES: TierListTheme[] = [
  "sunset",
  "forest",
  "ocean",
  "cyberpunk",
  "burgundy",
]

const SCROLL_AMOUNT = 240

/** Хук: отслеживает возможность горизонтальной прокрутки ленты */
function useScrollArrows<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    updateArrows()
    el.addEventListener("scroll", updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateArrows)
      ro.disconnect()
    }
  }, [updateArrows])

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = ref.current
    if (!el) return
    el.scrollBy({
      left: direction === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
      behavior: "smooth",
    })
  }, [])

  return { ref, canScrollLeft, canScrollRight, scrollBy }
}

/** Горизонтальная лента со стрелками (как жанры на /community) */
function ThemeStrip({
  children,
  label,
}: {
  children: ReactNode
  label?: string
}) {
  const { ref, canScrollLeft, canScrollRight, scrollBy } =
    useScrollArrows<HTMLDivElement>()

  return (
    <div className="theme-picker__section">
      {label && (
        <div className="theme-picker__header">
          <span className="theme-picker__label">{label}</span>
        </div>
      )}
      <button
        type="button"
        aria-label="Прокрутить темы влево"
        onClick={() => scrollBy("left")}
        className={`theme-picker__arrow theme-picker__arrow--left ${
          canScrollLeft ? "theme-picker__arrow--visible" : ""
        }`}
      >
        <span className="theme-picker__arrow-btn nb-heavy-border">
          <ChevronLeft size={14} />
        </span>
      </button>

      <div ref={ref} className="theme-picker__grid">
        {children}
      </div>

      <button
        type="button"
        aria-label="Прокрутить темы вправо"
        onClick={() => scrollBy("right")}
        className={`theme-picker__arrow theme-picker__arrow--right ${
          canScrollRight ? "theme-picker__arrow--visible" : ""
        }`}
      >
        <span className="theme-picker__arrow-btn nb-heavy-border">
          <ChevronRight size={14} />
        </span>
      </button>
    </div>
  )
}

export function ThemePicker({
  tierListId,
  currentTheme,
  onThemeChanged,
}: ThemePickerProps) {
  const [saving, setSaving] = useState(false)

  const handleSelect = async (theme: TierListTheme) => {
    setSaving(true)

    // Сначала переключаем тему локально (чтобы UI не ждал ответа сервера)
    onThemeChanged(theme)

    // Пропускаем API-запрос, если тир-лист ещё не создан (id = "new" или "fork-...")
    const isRealTierList = tierListId && !/^(new|fork-)/.test(tierListId)
    if (isRealTierList) {
      try {
        await apiClient.put(`/tier-lists/${tierListId}`, { theme })
        sileo.success({ title: `Тема: ${THEME_LABELS[theme]}` })
      } catch {
        sileo.error({ title: "Ошибка при смене темы" })
      }
    } else {
      sileo.success({ title: `Тема: ${THEME_LABELS[theme]}` })
    }

    setSaving(false)
  }

  const renderSwatch = (id: TierListTheme) => {
    const colors = THEME_COLORS[id]
    return (
      <button
        key={id}
        onClick={() => handleSelect(id)}
        disabled={saving}
        className={`theme-picker__swatch ${currentTheme === id ? "theme-picker__swatch--active" : ""}`}
        type="button"
        title={THEME_LABELS[id]}
      >
        <div
          className="theme-picker__preview"
          style={{
            background: `linear-gradient(135deg, ${colors.bg}, ${colors.bg}88)`,
            borderColor: colors.tier,
          }}
        >
          <div className="theme-picker__bars">
            <span style={{ background: colors.tier }} />
            <span style={{ background: colors.tier }} />
            <span style={{ background: colors.tier }} />
          </div>
        </div>
        <span className="theme-picker__name">{THEME_LABELS[id]}</span>
        {currentTheme === id && <span className="theme-picker__dot" />}
      </button>
    )
  }

  return (
    <div className="theme-picker">
      <ThemeStrip label="Стиль">{STYLE_THEMES.map(renderSwatch)}</ThemeStrip>
      <ThemeStrip label="Цветовая тема">{COLOR_THEMES.map(renderSwatch)}</ThemeStrip>
    </div>
  )
}
