import { useState } from "react"
import { Heart, ChevronDown, ChevronUp, Minus } from "lucide-react"
import type { TasteMatchResult } from "@/lib/userApi"

interface TasteMatchBannerProps {
  tasteMatch: TasteMatchResult
}

const TIER_FALLBACKS = ["S", "A", "B", "C", "D", "F"]

function getTierLabel(
  name: string | null | undefined,
  rank: number | null | undefined,
): string {
  if (name && name.trim().length > 0) return name
  if (
    rank !== null &&
    rank !== undefined &&
    rank >= 0 &&
    rank < TIER_FALLBACKS.length
  ) {
    return TIER_FALLBACKS[rank]
  }
  return "—"
}

function ComparisonIndicator({
  userRank,
  profileRank,
}: {
  userRank: number | null
  profileRank: number | null
}) {
  if (userRank !== null && profileRank !== null) {
    if (Math.abs(profileRank - userRank) <= 1) {
      return (
        <span
          className="inline-flex shrink-0"
          title="Оценки близки или совпадают"
        >
          <Minus size={12} className="text-green-400" />
        </span>
      )
    }
    if (profileRank < userRank) {
      return (
        <span className="inline-flex shrink-0" title="Пользователь оценил выше">
          <ChevronUp size={12} className="text-[var(--p-primary)]" />
        </span>
      )
    }
    return (
      <span className="inline-flex shrink-0" title="Пользователь оценил ниже">
        <ChevronDown size={12} className="text-pink-400" />
      </span>
    )
  }
  return (
    <span
      className="inline-flex shrink-0"
      title="Оценки близки или совпадают"
    >
      <Minus size={12} className="text-green-400" />
    </span>
  )
}

function commonBooksLabel(commonBooks: number): string {
  if (commonBooks === 1) return "общая книга"
  if (commonBooks < 5) return "общих книги"
  return "общих книг"
}

/**
 * Баннер совпадения вкусов (спека §6.2) — перенос существующей разметки
 * из UserProfilePage. Запрос apiGetTasteMatch остаётся на странице,
 * компонент получает готовый результат через пропс.
 * При commonBooks = 0 — компактная строка без раскрытия.
 */
export function TasteMatchBanner({ tasteMatch }: TasteMatchBannerProps) {
  const [expanded, setExpanded] = useState(false)

  const hasCommonBooks = tasteMatch.commonBooks > 0
  const hasMatches = !!tasteMatch.matches && tasteMatch.matches.length > 0
  // Кнопка только когда есть что показать — без ложной интерактивности.
  const expandable = hasCommonBooks && hasMatches

  const heading = (
    <span className="font-[Manrope] text-base font-semibold text-[var(--p-on-surface)]">
      Совпадение вкусов:{" "}
      <span className="text-[var(--p-primary)]">{tasteMatch.matchPercent}%</span>
    </span>
  )

  const subtitle = hasCommonBooks ? (
    <span className="text-sm text-[var(--p-on-surface-variant)]">
      {tasteMatch.commonBooks} {commonBooksLabel(tasteMatch.commonBooks)} из{" "}
      {tasteMatch.totalBooks}
    </span>
  ) : (
    <span className="text-sm text-[var(--p-on-surface-variant)]">
      {tasteMatch.commonBooks} общих книг из {tasteMatch.totalBooks}
    </span>
  )

  return (
    <section className="profile-taste-banner">
      {expandable ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls="taste-match-details"
          className="profile-taste-banner__toggle w-full p-4 flex items-center justify-between text-left cursor-pointer transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-primary)]/50"
        >
          <div className="flex items-center gap-4">
            <Heart size={20} className="text-[var(--p-primary)] shrink-0" />
            <div className="flex flex-col">
              {heading}
              {subtitle}
            </div>
          </div>
          {expanded ? (
            <ChevronUp
              size={20}
              className="text-[var(--p-on-surface-variant)] shrink-0"
            />
          ) : (
            <ChevronDown
              size={20}
              className="text-[var(--p-on-surface-variant)] shrink-0"
            />
          )}
        </button>
      ) : (
        <div className="w-full p-4 flex items-center gap-4 text-left">
          <Heart size={20} className="text-[var(--p-primary)] shrink-0" />
          <div className="flex flex-col">
            {heading}
            {subtitle}
          </div>
        </div>
      )}

      {expanded && expandable && (
        <div
          id="taste-match-details"
          className="border-t border-[var(--p-outline-variant)]/30 px-4 py-3 bg-[var(--p-surface-container-low)]/40 flex flex-col gap-2.5"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--p-on-surface-variant)]">
            А где поставили (ваш тир → тир пользователя)
          </div>
          <div className="flex flex-col gap-2">
            {tasteMatch.matches?.map((m, idx) => {
              const userLabel = getTierLabel(m.tierInMine, m.tierInMineRank)
              const profileLabel = getTierLabel(
                m.tierInProfile,
                m.tierInProfileRank,
              )
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs py-1 px-1.5 rounded hover:bg-[var(--p-surface-container-high)]/50 transition-colors"
                >
                  {m.book.coverImageUrl && (
                    <img
                      src={m.book.coverImageUrl}
                      alt={m.book.title}
                      className="h-5 w-3.5 rounded object-cover shrink-0"
                    />
                  )}
                  <span className="flex-1 truncate text-[var(--p-on-surface)]">
                    {m.book.title}
                    {m.book.author ? ` (${m.book.author})` : ""}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono">
                    <span
                      className="inline-block max-w-25 sm:max-w-30 truncate rounded bg-pink-500/10 px-1.5 py-0.5 font-medium text-pink-400"
                      title={userLabel}
                    >
                      {userLabel}
                    </span>
                    <ComparisonIndicator
                      userRank={m.tierInMineRank}
                      profileRank={m.tierInProfileRank}
                    />
                    <span
                      className="inline-block max-w-25 sm:max-w-30 truncate rounded bg-[var(--p-primary-container)]/20 px-1.5 py-0.5 font-medium text-[var(--p-primary)]"
                      title={profileLabel}
                    >
                      {profileLabel}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
