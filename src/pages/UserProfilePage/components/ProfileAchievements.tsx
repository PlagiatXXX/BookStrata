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

type ProfileAchievementsProps =
  | ProfileAchievementsOwnerProps
  | ProfileAchievementsVisitorProps

/** Локальные фильтры владельца (спека §6.4). */
type AchievementFilter = "all" | "earned" | "in-progress" | "locked"

const FILTERS: Array<{ value: AchievementFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "earned", label: "Получено" },
  { value: "in-progress", label: "В процессе" },
  { value: "locked", label: "Закрыто" },
]

const SECRET_TITLE = "Секретное достижение"
const SECRET_DESCRIPTION = "???"

/** Достижения владельца — поля как есть; progress может отсутствовать у старых данных. */
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

/** Публичные достижения: всё пришедшее — полученное, без секретов и прогресса (§7.2). */
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

/** Группа сортировки: полученные → в процессе → закрытые. */
function sortGroup(view: AchievementView): 0 | 1 | 2 {
  if (view.isEarned) return 0
  if (view.progress && view.progress.target > 0) return 1
  return 2
}

/** Владелец: полученные по earnedAt desc, затем в процессе (процент desc, потом target desc), затем закрытые по названию. */
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

/** Порядок фильтра сохраняется в выборке. */
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

/** Сетка достижений профиля (спека §6.4): состояния, прогресс, фильтры владельца. */
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
        <div className="profile-achievements__grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="profile-achievements__skeleton-card"
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
    <div className="profile-achievements">
      {mode === "owner" && (
        <div
          className="profile-achievements__filters"
          role="group"
          aria-label="Фильтры достижений"
        >
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="profile-achievements__filter"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="profile-achievements__empty">Пока нет достижений</p>
      ) : (
        <div className="profile-achievements__grid">
          {visible.map((view) => {
            const hidden = view.isSecret && !view.isEarned
            const title = hidden ? SECRET_TITLE : view.title
            const description = hidden ? SECRET_DESCRIPTION : view.description
            const locked = !view.isEarned && !view.progress && !hidden

            return (
              <article
                key={view.id}
                className={`profile-achievement-card${
                  view.isEarned
                    ? " profile-achievement-card--earned"
                    : " profile-achievement-card--locked"
                }`}
              >
                {hidden && (
                  <Lock
                    size={16}
                    aria-hidden="true"
                    className="profile-achievement-card__secret-icon"
                  />
                )}
                {locked && (
                  <Lock
                    size={16}
                    aria-hidden="true"
                    className="profile-achievement-card__lock"
                  />
                )}

                <div className="profile-achievement-card__icon" aria-hidden="true">
                  {hidden ? (
                    <Lock size={22} aria-hidden="true" />
                  ) : view.iconUrl ? (
                    <span>{view.iconUrl}</span>
                  ) : (
                    <Star size={22} aria-hidden="true" />
                  )}
                </div>

                <h3 className="profile-achievement-card__title">{title}</h3>
                <p className="profile-achievement-card__description">
                  {description}
                </p>

                {view.progress && !hidden && (
                  <div className="profile-achievement-card__progress">
                    <div
                      className="profile-achievement-card__progress-track"
                      role="progressbar"
                      aria-valuenow={view.progress.current}
                      aria-valuemin={0}
                      aria-valuemax={view.progress.target}
                      aria-label={`Прогресс: ${title}`}
                    >
                      <div
                        className="profile-achievement-card__progress-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (view.progress.current / view.progress.target) * 100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="profile-achievement-card__progress-text">
                      {view.progress.current} / {view.progress.target}
                    </span>
                  </div>
                )}

                <div className="profile-achievement-card__meta">
                  {!hidden && (
                    <span className="profile-achievement-card__xp">
                      +{view.xpValue} XP
                    </span>
                  )}
                  {view.isEarned && view.earnedAt && (
                    <time
                      className="profile-achievement-card__earned"
                      dateTime={view.earnedAt}
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

      {truncated && (
        <button
          type="button"
          className="profile-achievements__show-all"
          onClick={onShowAll}
        >
          Все достижения
        </button>
      )}
    </div>
  )
}
