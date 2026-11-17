import { XP_PER_LEVEL, levelFromXp, xpProgress } from "@/lib/level"

interface ProfileLevelProps {
  xp: number
  showXpLabel: boolean
}

export function ProfileLevel({ xp, showXpLabel }: ProfileLevelProps) {
  const level = levelFromXp(xp)
  const progress = xpProgress(xp)
  const percent = Math.min(100, (progress / XP_PER_LEVEL) * 100)

  return (
    <div className="profile-hero__level">
      <div className="profile-hero__level-row">
        <b className="profile-hero__level-value">Уровень {level}</b>
        {showXpLabel && (
          <span className="profile-hero__level-xp m">
            {progress} / {XP_PER_LEVEL} XP до уровня {level + 1}
          </span>
        )}
      </div>
      <div
        className="bar profile-hero__level-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={XP_PER_LEVEL}
        aria-valuenow={progress}
        aria-label={`Прогресс до уровня ${level + 1}`}
      >
        <i
          className="profile-hero__level-bar-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
