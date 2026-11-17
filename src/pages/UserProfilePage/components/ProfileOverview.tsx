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
  achievementsSlot?: ReactNode
  onEditGenres?: () => void
  onOpenAchievements?: () => void
  onOpenTierList: (id: string) => void
}

/**
 * Вкладка «Обзор» (спека §6.5, макет обзор). Порядок:
 * 2 колонки (жанры + читательский ДНК слева, достижения справа) + публичные тир-листы снизу.
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
  onOpenAchievements: _onOpenAchievements,
  onOpenTierList,
}: ProfileOverviewProps) {
  const isOwner = mode === "owner"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Верхний ряд: Любимые жанры слева, Читательский билет справа */}
      <div className="profile-overview-layout">
        <ProfileGenres genres={genres} isOwner={isOwner} onEdit={onEditGenres} />
        <ProfileDnaCard dna={dna} isOwner={isOwner} axes={dnaAxes} />
      </div>

      {/* Публичные тир-листы выше достижений */}
      <ProfileTierLists
        tierLists={tierLists}
        isLoading={tierListsLoading}
        isOwner={isOwner}
        onOpen={onOpenTierList}
      />

      {/* Секция достижений ниже */}
      {achievementsSlot && (
        <section
          aria-label="Достижения"
          className="card"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <h2 className="h">Достижения</h2>
          <div style={{ flex: 1 }}>{achievementsSlot}</div>
        </section>
      )}
    </div>
  )
}
