import { Trophy } from "lucide-react"
import type { ReactNode } from "react"
import type { CategoryId } from "@/data/genre-taxonomy"
import type { PublicUserDna } from "@/lib/userApi"
import type { DnaAxesData } from "@/lib/readingDnaApi"
import type { TierListShort } from "@/lib/tierListApi"
import { ProfileGenres } from "./ProfileGenres"
import { ProfileDnaCard } from "./ProfileDnaCard"
import { ProfileTierLists } from "./ProfileTierLists"

interface ProfileOverviewProps {
  mode: "owner" | "visitor"
  genres: CategoryId[]
  dna: PublicUserDna | null
  dnaAxes?: DnaAxesData | null
  tierLists: TierListShort[]
  tierListsLoading?: boolean
  /** Слот блока достижений (сетка рендерится задачей достижений). */
  achievementsSlot?: ReactNode
  /** Кнопка «Изменить» в блоке жанров — к настройкам, блок жанров. */
  onEditGenres?: () => void
  /** Кнопка «Все достижения» — к вкладке достижений. */
  onOpenAchievements?: () => void
  onOpenTierList: (id: string) => void
}

/**
 * Вкладка «Обзор» (спека §6.5). Порядок блоков:
 * жанры → читательский ДНК → достижения → публичные тир-листы.
 */
export function ProfileOverview({
  mode,
  genres,
  dna,
  dnaAxes,
  tierLists,
  tierListsLoading = false,
  achievementsSlot,
  onEditGenres,
  onOpenAchievements,
  onOpenTierList,
}: ProfileOverviewProps) {
  const isOwner = mode === "owner"

  return (
    <div className="profile-overview">
      <ProfileGenres genres={genres} isOwner={isOwner} onEdit={onEditGenres} />

      <ProfileDnaCard dna={dna} isOwner={isOwner} axes={dnaAxes} />

      {achievementsSlot && (
        <section aria-label="Достижения" className="profile-section">
          <div className="profile-section__header">
            <span className="profile-pill-label">Достижения</span>
            {onOpenAchievements && (
              <button
                type="button"
                className="profile-section__action"
                onClick={onOpenAchievements}
              >
                <Trophy size={14} aria-hidden="true" />
                Все достижения
              </button>
            )}
          </div>
          {achievementsSlot}
        </section>
      )}

      <ProfileTierLists
        tierLists={tierLists}
        isLoading={tierListsLoading}
        isOwner={isOwner}
        onOpen={onOpenTierList}
      />
    </div>
  )
}
