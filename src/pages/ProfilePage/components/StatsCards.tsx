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
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 min-w-0">
      <div className="cursor-pointer rounded-lg bg-[#1a1a2e] p-2 xs:p-3 text-center shadow-lg transition-shadow hover:shadow-primary/10 dark:bg-[#1a1a2e] light:bg-white sm:rounded-xl sm:p-5">
        <div className="flex items-center justify-center gap-1 mb-1 sm:gap-2 sm:mb-2">
          <List className="size-[18px] sm:size-5 text-cyan-400" />
        </div>
        <p className="text-lg xs:text-xl font-bold text-white dark:text-white light:text-gray-900 sm:text-2xl md:text-3xl">
          {stats?.tierListsCount || 0}
        </p>
        <p className="text-[11px] xs:text-xs text-gray-400 mt-1 sm:text-sm truncate">Тир-листы</p>
      </div>

      <div className="cursor-pointer rounded-lg bg-[#1a1a2e] p-2 xs:p-3 text-center shadow-lg transition-shadow hover:shadow-primary/10 dark:bg-[#1a1a2e] light:bg-white sm:rounded-xl sm:p-5">
        <div className="flex items-center justify-center gap-1 mb-1 sm:gap-2 sm:mb-2">
          <Folder className="size-[18px] sm:size-5 text-purple-400" />
        </div>
        <p className="text-lg xs:text-xl font-bold text-white dark:text-white light:text-gray-900 sm:text-2xl md:text-3xl">
          {stats?.templatesCount || 0}
        </p>
        <p className="text-[11px] xs:text-xs text-gray-400 mt-1 sm:text-sm truncate">Шаблоны</p>
      </div>

      <div className="cursor-pointer rounded-lg bg-[#1a1a2e] p-2 xs:p-3 text-center shadow-lg transition-shadow hover:shadow-primary/10 dark:bg-[#1a1a2e] light:bg-white sm:rounded-xl sm:p-5">
        <div className="flex items-center justify-center gap-1 mb-1 sm:gap-2 sm:mb-2">
          <Heart className="size-[18px] sm:size-5 text-pink-400" />
        </div>
        <p className="text-lg xs:text-xl font-bold text-white dark:text-white light:text-gray-900 sm:text-2xl md:text-3xl">
          {stats?.likesCount || 0}
        </p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="text-[10px] text-gray-500 sm:text-xs truncate">
            За сутки:
          </span>
          <span className="text-[10px] font-medium text-pink-400 sm:text-xs shrink-0">
            {stats?.likesTodayCount ? `+${stats.likesTodayCount}` : "+0"}
          </span>
        </div>
      </div>
    </div>
  );
}
