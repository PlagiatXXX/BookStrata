import { useQuery } from "@tanstack/react-query"
import { Trophy, Medal, Star } from "lucide-react"
import { apiGetMyAchievements, apiGetMyAchievementStatus } from "@/lib/achievementApi"
import "./DashboardAchievements.css"

const XP_PER_LEVEL = 100

function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

function xpProgress(xp: number): number {
  return xp % XP_PER_LEVEL
}

export function DashboardAchievements() {
  const { data: status } = useQuery({
    queryKey: ["achievements", "status"],
    queryFn: apiGetMyAchievementStatus,
    staleTime: 5 * 60 * 1000,
  })

  const { data: achievements } = useQuery({
    queryKey: ["achievements", "me"],
    queryFn: apiGetMyAchievements,
    staleTime: 5 * 60 * 1000,
  })

  const xp = status?.xp ?? 0
  const title = status?.title ?? "Новичок"
  const level = levelFromXp(xp)
  const progress = xpProgress(xp)
  const earned = achievements?.filter((a) => a.isEarned) ?? []
  const latest = earned.slice(-4).reverse()

  return (
    <section className="dashboard-achievements">
      <div className="dashboard-achievements__container">
        <div className="dashboard-achievements__grid">
          {/* XP Card */}
          <div className="dashboard-achievements__card dashboard-achievements__card--xp">
            <div className="dashboard-achievements__xp-header">
              <div>
                <p className="dashboard-achievements__label">Уровень {level}</p>
                <p className="dashboard-achievements__title">{title}</p>
              </div>
              <div className="dashboard-achievements__level-badge">
                <Trophy size={20} />
                <span>{level}</span>
              </div>
            </div>
            <div className="dashboard-achievements__xp-bar">
              <div
                className="dashboard-achievements__xp-fill"
                style={{ width: `${(progress / XP_PER_LEVEL) * 100}%` }}
              />
            </div>
            <p className="dashboard-achievements__xp-text">
              {xp} XP · {XP_PER_LEVEL - progress} XP до уровня {level + 1}
            </p>
          </div>

          {/* Latest Achievements */}
          <div className="dashboard-achievements__card dashboard-achievements__card--list">
            <div className="dashboard-achievements__list-header">
              <Medal size={16} />
              <span>Достижения</span>
            </div>
            {latest.length === 0 ? (
              <p className="dashboard-achievements__empty">
                Пока нет достижений. Создайте тир-лист, чтобы получить первое!
              </p>
            ) : (
              <div className="dashboard-achievements__list">
                {latest.map((a) => (
                  <div key={a.id} className="dashboard-achievements__item">
                    <Star size={14} className="dashboard-achievements__item-icon" />
                    <div>
                      <p className="dashboard-achievements__item-title">{a.title}</p>
                      <p className="dashboard-achievements__item-desc">{a.description}</p>
                    </div>
                    <span className="dashboard-achievements__item-xp">+{a.xpValue} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
