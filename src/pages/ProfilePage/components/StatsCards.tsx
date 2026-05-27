import { List, Folder, Heart } from "lucide-react";

interface UserStats {
  tierListsCount: number;
  templatesCount: number;
  likesCount: number;
  likesTodayCount: number;
}

interface StatsCardsProps {
  stats?: UserStats | null;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      <div className="cursor-pointer rounded-lg bg-[#1a1a2e] p-3 text-center shadow-lg transition-shadow hover:shadow-primary/10 dark:bg-[#1a1a2e] light:bg-white sm:rounded-xl sm:p-5">
        <div className="flex items-center justify-center gap-1 mb-1 sm:gap-2 sm:mb-2">
          <List size={18} className="text-cyan-400 sm:size-5" />
        </div>
        <p className="text-xl font-bold text-white dark:text-white light:text-gray-900 sm:text-2xl md:text-3xl">
          {stats?.tierListsCount || 0}
        </p>
        <p className="text-xs text-gray-400 mt-1 sm:text-sm">Тир-листы</p>
      </div>

      <div className="cursor-pointer rounded-lg bg-[#1a1a2e] p-3 text-center shadow-lg transition-shadow hover:shadow-primary/10 dark:bg-[#1a1a2e] light:bg-white sm:rounded-xl sm:p-5">
        <div className="flex items-center justify-center gap-1 mb-1 sm:gap-2 sm:mb-2">
          <Folder size={18} className="text-purple-400 sm:size-5" />
        </div>
        <p className="text-xl font-bold text-white dark:text-white light:text-gray-900 sm:text-2xl md:text-3xl">
          {stats?.templatesCount || 0}
        </p>
        <p className="text-xs text-gray-400 mt-1 sm:text-sm">Шаблоны</p>
      </div>

      <div className="cursor-pointer rounded-lg bg-[#1a1a2e] p-3 text-center shadow-lg transition-shadow hover:shadow-primary/10 dark:bg-[#1a1a2e] light:bg-white sm:rounded-xl sm:p-5">
        <div className="flex items-center justify-center gap-1 mb-1 sm:gap-2 sm:mb-2">
          <Heart size={18} className="text-pink-400 sm:size-5" />
        </div>
        <p className="text-xl font-bold text-white dark:text-white light:text-gray-900 sm:text-2xl md:text-3xl">
          {stats?.likesCount || 0}
        </p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="text-[10px] text-gray-500 sm:text-xs">
            За сутки:
          </span>
          <span className="text-[10px] font-medium text-pink-400 sm:text-xs">
            {stats?.likesTodayCount ? `+${stats.likesTodayCount}` : "+0"}
          </span>
        </div>
      </div>
    </div>
  );
}
