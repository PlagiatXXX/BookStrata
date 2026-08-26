import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { apiGetMyAchievements } from "@/lib/achievementApi";
import type { Achievement } from "@/lib/achievementApi";

export function AchievementsPanel({ max = 4 }: { max?: number }) {
  const { data: achievements } = useQuery({
    queryKey: ["achievements", "me"],
    queryFn: apiGetMyAchievements,
    staleTime: 5 * 60 * 1000,
  });

  const earned = (achievements ?? [])
    .filter((a) => a.isEarned)
    .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""));
  const locked = (achievements ?? []).filter((a) => !a.isEarned);
  const showLocked = earned.length === 0;
  const items: Achievement[] = showLocked
    ? locked.slice(0, max)
    : earned.slice(0, max);

  return (
    <div className="activity-achievements rounded-2xl p-4 sm:p-5">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
        <Award size={18} className="text-violet-300" />
        Достижения
      </h3>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">
          Создайте тир-лист, чтобы получить первое достижение!
        </p>
      ) : (
        <ol className="activity-achievements__list relative space-y-4 before:absolute before:bottom-3 before:left-3.75 before:top-3 before:w-px">
          {items.map((a) => (
            <li
              key={a.id}
              className="activity-achievements__item relative flex items-start gap-3"
            >
              <span
                className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm ${
                  a.isEarned
                    ? "border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.35)]"
                    : "border-gray-700 bg-gray-800 opacity-60"
                }`}
                aria-hidden
              >
                {a.iconUrl || <Award size={14} className="text-gray-400" />}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-semibold ${
                    a.isEarned ? "text-white" : "text-gray-500"
                  }`}
                >
                  {a.title}
                </p>
                <p
                  className={`truncate text-xs ${
                    a.isEarned ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {a.description}
                </p>
              </div>
              {a.isEarned && (
                <span className="shrink-0 text-xs font-bold text-emerald-400">
                  +{a.xpValue} XP
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {showLocked && items.length > 0 && (
        <p className="mt-4 border-t border-gray-800 pt-3 text-xs text-gray-500">
          Это заблокированные достижения — заработайте их, чтобы открыть
        </p>
      )}
    </div>
  );
}
