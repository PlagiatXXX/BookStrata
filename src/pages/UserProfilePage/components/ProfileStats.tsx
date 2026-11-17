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

export type ProfileStatsAllProps = ProfileStatsProps | ProfileStatsVisitorProps

interface StatCard {
  label: string
  value: number
  onClick?: () => void
}

/**
 * Три подписанные карточки статистики (спека §6.3, макет обзор).
 * Кликабельна только карточка «Тир-листов» — у остальных нет cursor-pointer.
 */
export function ProfileStats(props: ProfileStatsAllProps) {
  const { stats, onOpenTierLists } = props

  const tierListsCard: StatCard = {
    label: "Тир-листов",
    value: stats.tierListsCount,
    onClick: onOpenTierLists,
  }

  const cards: StatCard[] = [
    tierListsCard,
    { label: "Книг в тир-листах", value: stats.totalBooks },
    { label: "Лайков на тир-листах", value: stats.likesCount },
  ]

  return (
    <section className="profile-stats-grid" aria-label="Статистика пользователя">
      {cards.map(({ label, value, onClick }) => {
        const interactive = !!onClick
        const Tag = interactive ? "button" : "div"
        const isLikes = label.includes("Лайков")

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
            className={`card profile-stat-card${interactive ? " cursor-pointer" : ""}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              font: "inherit",
            }}
          >
            <div
              className="profile-stat-num"
              style={{ color: isLikes ? "#f9a8d4" : undefined }}
            >
              {value}
            </div>
            <div className="m profile-stat-label">{label}</div>
          </Tag>
        )
      })}
    </section>
  )
}
