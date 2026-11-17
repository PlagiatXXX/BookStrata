import type { CSSProperties } from "react"
import { getBadgeDescription } from "@/lib/badgeDescriptions"

/**
 * Единая мапа цветов бейджей профиля (роль + кастомные бейджи).
 * Заменяет дублирующиеся тернарники в ProfileHeader / UserProfilePage.
 * Неизвестный цвет откатывается к cyan.
 */
const BADGE_COLOR_STYLES: Record<string, CSSProperties> = {
  purple: {
    background: "rgba(168, 85, 247, 0.2)",
    color: "#c084fc",
    borderColor: "rgba(168, 85, 247, 0.5)",
  },
  blue: {
    background: "rgba(59, 130, 246, 0.2)",
    color: "#93c5fd",
    borderColor: "rgba(59, 130, 246, 0.5)",
  },
  amber: {
    background: "rgba(245, 158, 11, 0.2)",
    color: "#fcd34d",
    borderColor: "rgba(245, 158, 11, 0.5)",
  },
  green: {
    background: "rgba(34, 197, 94, 0.2)",
    color: "#86efac",
    borderColor: "rgba(34, 197, 94, 0.5)",
  },
  red: {
    background: "rgba(239, 68, 68, 0.2)",
    color: "#fca5a5",
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  cyan: {
    background: "rgba(34, 211, 238, 0.2)",
    color: "#67e8f9",
    borderColor: "rgba(34, 211, 238, 0.5)",
  },
}

interface ProfileBadgeProps {
  text: string
  color: string
  description?: string
}

export function ProfileBadge({ text, color, description }: ProfileBadgeProps) {
  const colorKey = color in BADGE_COLOR_STYLES ? color : "cyan"
  const tooltipText = description ?? getBadgeDescription(text)

  return (
    <span
      className={`profile-badge profile-badge--${colorKey}`}
      style={BADGE_COLOR_STYLES[colorKey]}
      tabIndex={0}
      aria-label={`${text}: ${tooltipText}`}
    >
      {text}
      <span className="profile-badge__tooltip" role="tooltip">
        {tooltipText}
      </span>
    </span>
  )
}
