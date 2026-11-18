import { useState, useRef, useEffect, useCallback, useContext, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { sileo } from "sileo"
import { AuthContext } from "@/contexts/auth.context"
import {
  type TierListTheme,
  THEME_LABELS,
  THEME_COLORS,
  updateTierListTheme,
  isSeasonalTheme,
  isAdminOnlyTheme,
  SEASONAL_THEMES,
} from "@/lib/tierListApi"

interface ThemePickerProps {
  tierListId: string
  currentTheme: string
  onThemeChanged: (theme: string) => void
  effectsEnabled?: boolean
  onToggleEffects?: (enabled: boolean) => void
  isAdmin?: boolean
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
  headerRight,
}: {
  children: ReactNode
  label?: string
  headerRight?: ReactNode
}) {
  const { ref, canScrollLeft, canScrollRight, scrollBy } =
    useScrollArrows<HTMLDivElement>()

  return (
    <div className="theme-picker__section">
      {(label || headerRight) && (
        <div className="theme-picker__header">
          {label && <span className="theme-picker__label">{label}</span>}
          {headerRight}
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
  effectsEnabled: effectsEnabledProp,
  onToggleEffects,
  isAdmin: isAdminProp,
}: ThemePickerProps) {
  const authContext = useContext(AuthContext)
  const isAdmin = isAdminProp !== undefined ? isAdminProp : authContext?.user?.role === "admin"
  const [saving, setSaving] = useState(false)
  const [internalEffectsEnabled, setInternalEffectsEnabled] = useState(() => {
    try {
      return typeof window !== "undefined"
        ? localStorage.getItem("bookstrata_seasonal_effects") !== "false"
        : true
    } catch {
      return true
    }
  })

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>
      if (customEvent.detail && typeof customEvent.detail.enabled === "boolean") {
        setInternalEffectsEnabled(customEvent.detail.enabled)
      }
    }
    window.addEventListener("seasonal-effects-toggle", handleToggle)
    return () => {
      window.removeEventListener("seasonal-effects-toggle", handleToggle)
    }
  }, [])

  const effectsEnabled =
    effectsEnabledProp !== undefined ? effectsEnabledProp : internalEffectsEnabled

  const toggleEffects = () => {
    const next = !effectsEnabled
    try {
      localStorage.setItem("bookstrata_seasonal_effects", String(next))
    } catch {
      /* localStorage может быть недоступен в private mode */
    }
    setInternalEffectsEnabled(next)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("seasonal-effects-toggle", { detail: { enabled: next } })
      )
    }
    onToggleEffects?.(next)
  }

  const handleSelect = async (theme: TierListTheme) => {
    setSaving(true)

    // Сначала переключаем тему локально (чтобы UI не ждал ответа сервера)
    onThemeChanged(theme)

    // Пропускаем API-запрос, если тир-лист ещё не создан (id = "new" или "fork-...")
    const isRealTierList = tierListId && !/^(new|fork-)/.test(tierListId)
    if (isRealTierList) {
      try {
        await updateTierListTheme(tierListId, theme)
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
    const isLocked = !isAdmin && isAdminOnlyTheme(id)
    const colors = THEME_COLORS[id]
    return (
      <button
        key={id}
        onClick={() => !isLocked && handleSelect(id)}
        disabled={saving || isLocked}
        className={`theme-picker__swatch ${currentTheme === id ? "theme-picker__swatch--active" : ""} ${
          isLocked ? "opacity-45 cursor-not-allowed hover:border-transparent" : ""
        }`}
        type="button"
        title={isLocked ? `${THEME_LABELS[id]} (в разработке — только для администраторов)` : THEME_LABELS[id]}
        aria-disabled={isLocked}
      >
        <div
          className="theme-picker__preview relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors.bg}, ${colors.bg}88)`,
            borderColor: colors.tier,
          }}
        >
          {isLocked ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs select-none">
              🔒
            </div>
          ) : (
            <div className="theme-picker__bars">
              <span style={{ background: colors.tier }} />
              <span style={{ background: colors.tier }} />
              <span style={{ background: colors.tier }} />
            </div>
          )}
        </div>
        <span className="theme-picker__name flex items-center justify-center gap-1">
          {THEME_LABELS[id]}
          {isLocked && <span className="text-[10px] text-amber-400">🔒</span>}
        </span>
        {currentTheme === id && !isLocked && <span className="theme-picker__dot" />}
      </button>
    )
  }

  if (isSeasonalTheme(currentTheme)) {
    return (
      <div className="theme-picker theme-picker--seasonal">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-(--theme-text-muted)">
            ✦ Сезонное оформление
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleEffects}
              aria-pressed={effectsEnabled}
              className="text-xs px-2.5 py-1 rounded-md border border-white/10 hover:border-white/20 transition-colors bg-white/5 cursor-pointer text-(--theme-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-focus)"
            >
              {effectsEnabled ? "✨ Эффекты: Вкл" : "Эффекты: Выкл"}
            </button>
            <button
              type="button"
              onClick={() => handleSelect("default")}
              className="text-xs px-2.5 py-1 rounded-md border border-white/10 hover:border-white/20 transition-colors bg-white/5 cursor-pointer text-(--theme-text-muted) hover:text-(--theme-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-focus)"
            >
              ↺ Классические темы
            </button>
          </div>
        </div>
        <ThemeStrip>
          {SEASONAL_THEMES.map(renderSwatch)}
        </ThemeStrip>
      </div>
    )
  }

  return (
    <div className="theme-picker">
      <ThemeStrip
        label="Стиль"
        headerRight={
          <button
            type="button"
            onClick={() => handleSelect(isAdmin ? "autumn-leaves" : "autumn-rain")}
            className="text-xs px-2.5 py-1 rounded-md border border-amber-500/30 hover:border-amber-500/60 transition-colors bg-amber-500/10 text-amber-300 font-medium cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-focus)"
          >
            <span>🍂❄️ Сезонные темы</span>
          </button>
        }
      >
        {STYLE_THEMES.map(renderSwatch)}
      </ThemeStrip>
      <ThemeStrip label="Цветовая тема">{COLOR_THEMES.map(renderSwatch)}</ThemeStrip>
    </div>
  )
}
