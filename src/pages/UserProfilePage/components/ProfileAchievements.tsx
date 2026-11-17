import { useMemo, useState } from "react"
import { Lock, Star } from "lucide-react"
import type { Achievement, PublicAchievement } from "@/lib/achievementApi"

/** Нормализованное представление достижения для рендера. */
export interface AchievementView {
  id: string
  title: string
  description: string
  iconUrl: string | null
  xpValue: number
  earnedAt: string | null
  isEarned: boolean
  isSecret: boolean
  progress: { current: number; target: number } | null
}

type ProfileAchievementsOwnerProps = {
  mode: "owner"
  achievements: Achievement[]
  isLoading?: boolean
  limit?: number
  onShowAll?: () => void
}

type ProfileAchievementsVisitorProps = {
  mode: "visitor"
  achievements: PublicAchievement[]
  isLoading?: boolean
  limit?: number
  onShowAll?: () => void
}

export type ProfileAchievementsProps =
  | ProfileAchievementsOwnerProps
  | ProfileAchievementsVisitorProps

type AchievementFilter = "all" | "earned" | "in-progress" | "locked"

const FILTERS: Array<{ value: AchievementFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "earned", label: "Получено" },
  { value: "in-progress", label: "В процессе" },
  { value: "locked", label: "Закрыто" },
]

const SECRET_TITLE = "Секретное достижение"
const SECRET_DESCRIPTION = "???"

function toOwnerView(achievement: Achievement): AchievementView {
  return {
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    iconUrl: achievement.iconUrl ?? null,
    xpValue: achievement.xpValue,
    earnedAt: achievement.earnedAt,
    isEarned: achievement.isEarned,
    isSecret: achievement.isSecret,
    progress: achievement.progress ?? null,
  }
}

function toVisitorView(achievement: PublicAchievement): AchievementView {
  return {
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    iconUrl: achievement.iconUrl ?? null,
    xpValue: achievement.xpValue,
    earnedAt: achievement.earnedAt,
    isEarned: true,
    isSecret: false,
    progress: null,
  }
}

function sortGroup(view: AchievementView): 0 | 1 | 2 {
  if (view.isEarned) return 0
  if (view.progress && view.progress.target > 0) return 1
  return 2
}

function compareViews(a: AchievementView, b: AchievementView): number {
  const groupA = sortGroup(a)
  const groupB = sortGroup(b)
  if (groupA !== groupB) return groupA - groupB

  if (groupA === 0) {
    const timeA = a.earnedAt ? Date.parse(a.earnedAt) : 0
    const timeB = b.earnedAt ? Date.parse(b.earnedAt) : 0
    return timeB - timeA
  }

  if (groupA === 1) {
    const progressA = a.progress!
    const progressB = b.progress!
    const ratioA = progressA.current / progressA.target
    const ratioB = progressB.current / progressB.target
    if (ratioB !== ratioA) return ratioB - ratioA
    return progressB.target - progressA.target
  }

  return (
    a.title.localeCompare(b.title, "ru") || a.id.localeCompare(b.id, "ru")
  )
}

function matchesFilter(view: AchievementView, filter: AchievementFilter): boolean {
  switch (filter) {
    case "earned":
      return view.isEarned
    case "in-progress":
      return !view.isEarned && !!view.progress
    case "locked":
      return !view.isEarned && !view.progress
    default:
      return true
  }
}

function formatEarnedDate(earnedAt: string): string {
  return new Date(earnedAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/**
 * Достижения профиля (макет обзор и таб достижений):
 * Компактный список строк .row со значками 44px, аккуратными описаниями и шкалой прогресса.
 */
export function ProfileAchievements(props: ProfileAchievementsProps) {
  const { mode, achievements, isLoading = false, limit, onShowAll } = props
  const [filter, setFilter] = useState<AchievementFilter>("all")

  const views = useMemo<AchievementView[]>(() => {
    const normalized = achievements.map((achievement) =>
      mode === "owner"
        ? toOwnerView(achievement as Achievement)
        : toVisitorView(achievement as PublicAchievement),
    )
    if (mode !== "owner") return normalized
    return [...normalized].sort(compareViews)
  }, [achievements, mode])

  const filtered = useMemo(
    () =>
      mode === "owner"
        ? views.filter((view) => matchesFilter(view, filter))
        : views,
    [views, filter, mode],
  )

  if (isLoading) {
    return (
      <div className="profile-achievements" aria-busy="true">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="profile-achievements__skeleton-card"
              style={{
                height: 60,
                background: "#232340",
                borderRadius: 12,
                opacity: 0.6,
              }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    )
  }

  const truncated = limit !== undefined && filtered.length > limit
  const visible = truncated ? filtered.slice(0, limit) : filtered

  return (
    <div className="profile-achievements" style={{ display: "flex", flexDirection: "column" }}>
      {mode === "owner" && limit === undefined && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}
          role="group"
          aria-label="Фильтры достижений"
        >
          {FILTERS.map(({ value, label }) => {
            const isSelected = filter === value
            return (
              <button
                key={value}
                type="button"
                className={`chip${isSelected ? " sel" : ""}`}
                style={{ padding: "6px 14px", minHeight: 34 }}
                aria-pressed={isSelected}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="m profile-achievements__empty" style={{ margin: "12px 0" }}>
          Пока нет достижений
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {visible.map((view, idx) => {
            const hidden = view.isSecret && !view.isEarned
            const title = hidden ? SECRET_TITLE : view.title
            const description = hidden ? SECRET_DESCRIPTION : view.description
            const locked = !view.isEarned && !view.progress && !hidden

            const ratio =
              view.progress && view.progress.target > 0
                ? Math.min(100, Math.round((view.progress.current / view.progress.target) * 100))
                : 0

            return (
              <article
                key={view.id}
                className="row profile-achievement-card"
                style={{
                  borderTop: idx === 0 ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "12px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                {/* Круглая иконка 44x44 */}
                <div
                  className="profile-achievement-card__icon"
                  style={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: view.isEarned
                      ? "2px solid #fbbf24"
                      : ratio > 0
                        ? "2px solid #7dd3fc"
                        : "2px solid #4b4b6b",
                    background: view.isEarned
                      ? "rgba(251, 191, 36, 0.12)"
                      : ratio > 0
                        ? "transparent"
                        : "rgba(75, 75, 107, 0.15)",
                    color: view.isEarned
                      ? "#fbbf24"
                      : ratio > 0
                        ? "#7dd3fc"
                        : "#a8aac0",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                  aria-hidden="true"
                >
                  {hidden ? (
                    <Lock size={18} aria-hidden="true" className="profile-achievement-card__secret-icon" />
                  ) : ratio > 0 ? (
                    <span>{ratio}%</span>
                  ) : view.iconUrl ? (
                    <span style={{ fontSize: 20 }}>{view.iconUrl}</span>
                  ) : (
                    <Star size={20} fill={view.isEarned ? "#fbbf24" : "none"} aria-hidden="true" />
                  )}
                </div>

                {/* Текст и прогресс */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <b
                      className="profile-achievement-card__title"
                      style={{
                        fontSize: 14,
                        color: hidden ? "#a8aac0" : "#f1f1f5",
                        fontWeight: 700,
                      }}
                    >
                      {title}
                    </b>
                    {locked && (
                      <Lock size={13} className="profile-achievement-card__lock" color="#a8aac0" aria-hidden="true" />
                    )}
                  </div>
                  <div className="m profile-achievement-card__description" style={{ marginTop: 2 }}>
                    {description}
                    {view.progress && !hidden && (
                      <>
                        {" · "}
                        <span className="profile-achievement-card__progress-text">
                          {view.progress.current} / {view.progress.target}
                        </span>
                      </>
                    )}
                  </div>
                  {view.progress && !hidden && (
                    <div
                      className="bar profile-achievement-card__progress-track"
                      style={{ height: 6, maxWidth: 260, marginTop: 6 }}
                      role="progressbar"
                      aria-valuenow={view.progress.current}
                      aria-valuemin={0}
                      aria-valuemax={view.progress.target}
                      aria-label={`Прогресс: ${title}`}
                    >
                      <i
                        className="profile-achievement-card__progress-fill"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* XP и дата */}
                <div
                  className="profile-achievement-card__meta"
                  style={{ textAlign: "right", flexShrink: 0 }}
                >
                  {!hidden && (
                    <span
                      className="profile-achievement-card__xp"
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: view.isEarned ? "#fbbf24" : "#a8aac0",
                        display: "block",
                      }}
                    >
                      +{view.xpValue} XP
                    </span>
                  )}
                  {view.isEarned && view.earnedAt && (
                    <time
                      className="m profile-achievement-card__earned"
                      dateTime={view.earnedAt}
                      style={{ fontSize: 11, display: "block", marginTop: 2 }}
                    >
                      {formatEarnedDate(view.earnedAt)}
                    </time>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {truncated && onShowAll && (
        <button
          type="button"
          className="btn profile-achievements__show-all"
          style={{ width: "100%", marginTop: 12 }}
          onClick={onShowAll}
        >
          Показать все
        </button>
      )}
    </div>
  )
}
