import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { apiGetMyAchievementStatus } from "@/lib/achievementApi";
import { XP_PER_LEVEL, levelFromXp, xpProgress } from "@/lib/level";

export function LevelCard() {
  const { data: status } = useQuery({
    queryKey: ["achievements", "status"],
    queryFn: apiGetMyAchievementStatus,
    staleTime: 5 * 60 * 1000,
  });

  const xp = status?.xp ?? 0;
  const level = levelFromXp(xp);
  const progress = xpProgress(xp);
  const percent = Math.round((progress / XP_PER_LEVEL) * 100);
  const filledSegments = Math.round((percent / 100) * 20);

  return (
    <div className="activity-level relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="bg-gradient-to-r from-white to-sky-200 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
            Уровень {level}
          </p>
          <p className="truncate text-sm text-cyan-200/90">
            {status?.title ?? "Новичок"} {status?.icon}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/50 bg-gradient-to-br from-sky-400/30 to-cyan-300/15 text-sky-200 shadow-[0_0_24px_rgba(56,189,248,0.45)] sm:h-14 sm:w-14">
          <Trophy size={26} />
        </div>
      </div>

      <div className="activity-level__progress relative mt-4">
        <div
          className="flex gap-1"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Прогресс до уровня ${level + 1}`}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className={`activity-level__segment h-4 flex-1 rounded-[4px] ${
                i < filledSegments
                  ? "bg-gradient-to-b from-sky-300 to-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                  : "bg-gray-800"
              }`}
            />
          ))}
        </div>
        {/* Проценты внутри шкалы */}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {percent}%
        </span>
      </div>

      <p className="mt-2 text-xs text-gray-300">
        {xp} XP · {XP_PER_LEVEL - progress} XP до уровня {level + 1}
      </p>
    </div>
  );
}
