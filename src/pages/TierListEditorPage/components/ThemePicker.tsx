import { useState } from "react"
import { Lock } from "lucide-react"
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
  isPro: boolean
  onThemeChanged: (theme: string) => void
}

export function ThemePicker({
  tierListId,
  currentTheme,
  isPro,
  onThemeChanged,
}: ThemePickerProps) {
  const [saving, setSaving] = useState(false)

  const handleSelect = async (theme: TierListTheme) => {
    if (!isPro && theme !== "default") {
      sileo.action({
        title: "Тема только для Pro",
        description: "Оформите подписку, чтобы использовать эксклюзивные темы оформления",
        duration: 4000,
      })
      return
    }

    setSaving(true)
    try {
      await apiClient.put(`/tier-lists/${tierListId}`, { theme })
      onThemeChanged(theme)
      sileo.success({ title: `Тема: ${THEME_LABELS[theme]}` })
    } catch {
      sileo.error({ title: "Ошибка при смене темы" })
    } finally {
      setSaving(false)
    }
  }

  const themes = Object.entries(THEME_LABELS) as [TierListTheme, string][]

  return (
    <div className="theme-picker">
      <div className="theme-picker__header">
        <span className="theme-picker__label">Тема оформления</span>
        <span className="theme-picker__hint">{saving ? "Сохранение..." : `${currentTheme === 'default' ? 'Бесплатно' : 'Pro'}`}</span>
      </div>
      <div className="theme-picker__grid">
        {themes.map(([id, label]) => {
          const colors = THEME_COLORS[id]
          const isLocked = !isPro && id !== "default"
          return (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              disabled={saving}
              className={`theme-picker__swatch ${currentTheme === id ? "theme-picker__swatch--active" : ""} ${isLocked ? "theme-picker__swatch--locked" : ""}`}
              type="button"
              title={isLocked ? "Доступно в Pro" : label}
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
                {isLocked && (
                  <div className="theme-picker__lock">
                    <Lock size={12} />
                  </div>
                )}
              </div>
              <span className="theme-picker__name">{label}</span>
              {currentTheme === id && <span className="theme-picker__dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
