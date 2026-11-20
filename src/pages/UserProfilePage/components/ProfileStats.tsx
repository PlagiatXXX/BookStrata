import type { PublicUserStats, UserStats } from "@/lib/userApi"
import { pluralize } from "@/utils/pluralize"

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

  const tierListsCount = stats.tierListsCount ?? 0
  const booksCount = stats.totalBooks ?? 0
  const likesCount = stats.likesCount ?? 0
  const commentsCount = stats.commentsCount ?? 0

  const tierListsCard: StatCard = {
    label: pluralize(tierListsCount, "Тир-лист", "Тир-листа", "Тир-листов"),
    value: tierListsCount,
    onClick: onOpenTierLists,
  }

  const cards: StatCard[] = [
    tierListsCard,
    {
      label: pluralize(booksCount, "Книга в тир-листах", "Книги в тир-листах", "Книг в тир-листах"),
      value: booksCount,
    },
    {
      label: pluralize(likesCount, "Лайк на тир-листах", "Лайка на тир-листах", "Лайков на тир-листах"),
      value: likesCount,
    },
    {
      label: pluralize(commentsCount, "Комментарий", "Комментария", "Комментариев"),
      value: commentsCount,
    },
  ]

  return (
    <section className="profile-stats-grid" aria-label="Статистика пользователя">
      {cards.map(({ label, value, onClick }) => {
        const interactive = !!onClick
        const Tag = interactive ? "button" : "div"
        const isLikes = label.toLowerCase().includes("лайк")

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
