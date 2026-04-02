import { Trophy, Lock, Star } from "lucide-react";
import { motion } from "framer-motion";

interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl?: string;
  xpValue: number;
  isEarned: boolean;
  earnedAt: string | null;
  isSecret: boolean;
}

interface AchievementsGridProps {
  achievements: Achievement[];
  isLoading: boolean;
}

export function AchievementsGrid({
  achievements,
  isLoading,
}: AchievementsGridProps) {
  if (isLoading) {
    return (
      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-white/5 brutal-border"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-(--ink-0)">
        <Trophy size={20} className="text-yellow-400" />
        Достижения
      </h3>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {achievements.map((achievement) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative flex flex-col items-center justify-center p-2 rounded-lg brutal-border transition-all ${
              achievement.isEarned
                ? "bg-[#2a162e] border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                : "bg-black/40 border-(--line-soft) grayscale opacity-60"
            }`}
          >
            <div
              className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                achievement.isEarned
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-(--line-soft) bg-white/5"
              }`}
            >
              {achievement.isEarned ? (
                <Star size={20} className="text-yellow-400 fill-yellow-400" />
              ) : (
                <Lock size={18} className="text-(--ink-1)" />
              )}
            </div>

            <h4 className="text-center text-xs font-bold text-(--ink-0) line-clamp-1">
              {achievement.title}
            </h4>
            <p className="mt-0.5 text-center text-[9px] text-(--ink-1) leading-tight line-clamp-2">
              {achievement.description}
            </p>

            {achievement.isEarned && (
              <div className="mt-1 rounded-full bg-yellow-400/20 px-1.5 py-0.5 text-[8px] font-bold text-yellow-400">
                +{achievement.xpValue} XP
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
