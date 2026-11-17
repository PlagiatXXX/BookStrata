import { Trophy, Layers, Heart, BookOpen, type LucideIcon } from "lucide-react"
import type { PublicUserStats, UserStats } from "@/lib/userApi"

interface ProfileStatsProps {
  mode: "owner"
  stats: UserStats
  /** Клик по карточке «Тир-листов» — переход к вкладке «Тир-листы». */
  onOpenTierLists?: () => void
}

interface ProfileStatsVisitorProps {
  mode: "visitor"
  stats: PublicUserStats
  onOpenTierLists?: () => void
}

type ProfileStatsAllProps = ProfileStatsProps | ProfileStatsVisitorProps

interface StatCard {
  icon: LucideIcon
  label: string
  value: number
  onClick?: () => void
}

/**
 * Три подписанные карточки статистики (спека §6.3).
 * Кликабельна только карточка «Тир-листов» — у остальных нет ложного cursor-pointer.
 * «За сутки: +N» из карточек убран (в макете его нет).
 */
export function ProfileStats(props: ProfileStatsAllProps) {
  const { mode, stats, onOpenTierLists } = props

  const tierListsCard: StatCard = {
    icon: Trophy,
    label: "Тир-листов",
    value: stats.tierListsCount,
    onClick: onOpenTierLists,
  }

  const cards: StatCard[] =
    mode === "owner"
      ? [
          tierListsCard,
          { icon: Layers, label: "Шаблонов", value: (stats as UserStats).templatesCount },
          { icon: Heart, label: "Лайков на тир-листах", value: stats.likesCount },
        ]
      : [
          tierListsCard,
          { icon: BookOpen, label: "Книг в тир-листах", value: stats.totalBooks },
          { icon: Heart, label: "Лайков на тир-листах", value: stats.likesCount },
        ]

  return (
    <div className="profile-stats">
      {cards.map(({ icon: Icon, label, value, onClick }) => {
        const interactive = !!onClick
        const Tag = interactive ? "button" : "div"
        return (
          <Tag
            key={label}
            {...(interactive
              ? {
                  type: "button" as const,
                  onClick,
                  "aria-label": `${label}: ${value}`,
                }
              : {})}
            className={`profile-stat-card${interactive ? " cursor-pointer" : ""}`}
          >
            <div className="profile-stat-label">
              <Icon size={14} aria-hidden="true" />
              {label}
            </div>
            <div className="profile-stat-value">{value}</div>
          </Tag>
        )
      })}
    </div>
  )
}
