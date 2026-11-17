import { Heart, BookOpen, ExternalLink } from "lucide-react"
import type { TierListShort } from "@/lib/tierListApi"
import { Spinner } from "@/components/Spinner"
import { PrivateBadge } from "@/components/PrivateBadge"

/** Превью обзора — до 6 карточек (спека §6.5). */
const PREVIEW_LIMIT = 6

interface ProfileTierListsProps {
  tierLists: TierListShort[]
  isLoading?: boolean
  isOwner: boolean
  /** Клик по карточке; получает slug или id — как в существующем поведении страницы. */
  onOpen: (id: string) => void
}

/**
 * Блок «Публичные тир-листы» (спека §6.4/§6.5): превью до 6 карточек,
 * пустое состояние «Пока нет публичных тир-листов», владельцу — ссылка в дашборд.
 */
export function ProfileTierLists({
  tierLists,
  isLoading = false,
  isOwner,
  onOpen,
}: ProfileTierListsProps) {
  const open = (tierList: TierListShort) => onOpen(tierList.id)

  return (
    <section aria-label="Публичные тир-листы" className="profile-section">
      <div className="profile-section__header">
        <span className="profile-pill-label">Публичные тир-листы</span>
        {isOwner && (
          <a
            href="/dashboard"
            className="profile-section__action"
          >
            <ExternalLink size={14} aria-hidden="true" />
            Управлять в дашборде
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : tierLists.length === 0 ? (
        <p className="profile-tier-lists__empty">
          Пока нет публичных тир-листов
        </p>
      ) : (
        <div className="profile-tier-lists__grid">
          {tierLists.slice(0, PREVIEW_LIMIT).map((tierList) => (
            <button
              key={tierList.id}
              type="button"
              className="profile-tier-card text-left"
              onClick={() => open(tierList)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  open(tierList)
                }
              }}
            >
              <span className="profile-tier-card__title">{tierList.title}</span>
              {!tierList.isPublic && <PrivateBadge />}
              <span className="profile-tier-card__meta">
                <span className="profile-tier-card__meta-item">
                  <Heart size={12} aria-hidden="true" />
                  {tierList.likesCount ?? 0}
                </span>
                <span className="profile-tier-card__meta-item">
                  <BookOpen size={12} aria-hidden="true" />
                  {tierList.booksCount ?? 0}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
