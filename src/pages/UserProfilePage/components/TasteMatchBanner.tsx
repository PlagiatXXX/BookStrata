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
          <ChevronUp size={12} className="text-[#fbbf24]" />
        </span>
      )
    }
    return (
      <span className="inline-flex shrink-0" title="Пользователь оценил ниже">
        <ChevronDown size={12} className="text-[#f9a8d4]" />
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
 * Баннер совпадения вкусов (макет вид посетителя).
 * Показывается только авторизованному не-владельцу.
 */
export function TasteMatchBanner({ tasteMatch }: TasteMatchBannerProps) {
  const [expanded, setExpanded] = useState(false)

  const hasCommonBooks = tasteMatch.commonBooks > 0
  const hasMatches = !!tasteMatch.matches && tasteMatch.matches.length > 0
  const expandable = hasCommonBooks && hasMatches

  const heading = (
    <span style={{ fontSize: 16, fontWeight: 800, color: "#f1f1f5", display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span>Совпадение вкусов:</span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 10px",
          borderRadius: 99,
          background: "rgba(244, 114, 182, 0.16)",
          border: "1px solid rgba(244, 114, 182, 0.4)",
          color: "#f9a8d4",
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: "0.02em",
          boxShadow: "0 0 12px rgba(244, 114, 182, 0.2)",
        }}
      >
        {tasteMatch.matchPercent}%
      </span>
    </span>
  )

  const subtitle = hasCommonBooks ? (
    <span className="m" style={{ color: "#a8aac0", fontSize: 13 }}>
      {tasteMatch.commonBooks} {commonBooksLabel(tasteMatch.commonBooks)} из{" "}
      {tasteMatch.totalBooks} · где вы оценили по-разному
    </span>
  ) : (
    <span className="m" style={{ color: "#a8aac0", fontSize: 13 }}>
      {tasteMatch.commonBooks} общих книг из {tasteMatch.totalBooks}
    </span>
  )

  return (
    <section className="card taste-match-card" aria-label="Совпадение вкусов">
      {expandable ? (
        <div style={{ width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="taste-match-icon-badge">
              <Heart size={20} color="#f9a8d4" fill="#f9a8d4" />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              {heading}
              {subtitle}
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-controls="taste-match-details"
              aria-label="Совпадение вкусов"
              style={{
                padding: "7px 14px",
                minHeight: 34,
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              Подробнее
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>

          {expanded && (
            <div
              id="taste-match-details"
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div className="h" style={{ marginBottom: 2, fontSize: 14, color: "#f1f1f5" }}>
                А где поставили (ваш тир → тир пользователя)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasteMatch.matches?.map((m, idx) => {
                  const userLabel = getTierLabel(m.tierInMine, m.tierInMineRank)
                  const profileLabel = getTierLabel(
                    m.tierInProfile,
                    m.tierInProfileRank,
                  )
                  return (
                    <div key={idx} className="taste-match-book-row">
                      {m.book.coverImageUrl ? (
                        <img
                          src={m.book.coverImageUrl}
                          alt={m.book.title}
                          className="taste-match-book-cover"
                        />
                      ) : (
                        <div
                          className="taste-match-book-cover"
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            color: "#a8aac0",
                          }}
                        >
                          📖
                        </div>
                      )}
                      <span style={{ flex: 1, color: "#f1f1f5", fontWeight: 500 }}>
                        {m.book.title}
                        {m.book.author ? ` (${m.book.author})` : ""}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          title="Ваш тир"
                          style={{
                            padding: "3px 9px",
                            borderRadius: 6,
                            background: "rgba(249, 168, 212, 0.16)",
                            border: "1px solid rgba(249, 168, 212, 0.4)",
                            color: "#f9a8d4",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {userLabel}
                        </span>
                        <ComparisonIndicator
                          userRank={m.tierInMineRank}
                          profileRank={m.tierInProfileRank}
                        />
                        <span
                          title="Тир пользователя"
                          style={{
                            padding: "3px 9px",
                            borderRadius: 6,
                            background: "rgba(251, 191, 36, 0.16)",
                            border: "1px solid rgba(251, 191, 36, 0.4)",
                            color: "#fcd34d",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
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
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
          <div className="taste-match-icon-badge">
            <Heart size={20} color="#f9a8d4" fill="#f9a8d4" />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            {heading}
            {subtitle}
          </div>
        </div>
      )}
    </section>
  )
}
