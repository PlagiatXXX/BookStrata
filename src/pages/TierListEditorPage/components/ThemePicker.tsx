import { useState } from "react"
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

export function ThemePicker({
  tierListId,
  currentTheme,
  onThemeChanged,
}: ThemePickerProps) {
  const [saving, setSaving] = useState(false)

  const handleSelect = async (theme: TierListTheme) => {
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
      </div>
      <div className="theme-picker__grid">
        {themes.map(([id, label]) => {
          const colors = THEME_COLORS[id]
          return (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              disabled={saving}
              className={`theme-picker__swatch ${currentTheme === id ? "theme-picker__swatch--active" : ""}`}
              type="button"
              title={label}
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
              <span className="theme-picker__name">{label}</span>
              {currentTheme === id && <span className="theme-picker__dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
