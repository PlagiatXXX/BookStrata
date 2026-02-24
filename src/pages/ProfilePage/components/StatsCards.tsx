import { List, Folder, Heart } from 'lucide-react';

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
    <div className="mt-6 grid grid-cols-3 gap-4">
      <div className="cursor-pointer rounded-xl bg-[#1a1a2e] p-5 text-center shadow-lg transition-shadow hover:shadow-primary/10 dark:bg-[#1a1a2e] light:bg-white sm:p-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <List size={20} className="text-cyan-400" />
        </div>
        <p className="text-2xl font-bold text-white dark:text-white light:text-gray-900 sm:text-3xl">
          {stats?.tierListsCount || 0}
        </p>
        <p className="text-sm text-gray-400 mt-1">Тир-листы</p>
      </div>

      <div className="cursor-pointer rounded-xl bg-[#1a1a2e] p-5 text-center shadow-lg transition-shadow hover:shadow-primary/10 dark:bg-[#1a1a2e] light:bg-white sm:p-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Folder size={20} className="text-purple-400" />
        </div>
        <p className="text-2xl font-bold text-white dark:text-white light:text-gray-900 sm:text-3xl">
          {stats?.templatesCount || 0}
        </p>
        <p className="text-sm text-gray-400 mt-1">Шаблоны</p>
      </div>

      <div className="cursor-pointer rounded-xl bg-[#1a1a2e] p-5 text-center shadow-lg transition-shadow hover:shadow-primary/10 dark:bg-[#1a1a2e] light:bg-white sm:p-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart size={20} className="text-pink-400" />
        </div>
        <p className="text-2xl font-bold text-white dark:text-white light:text-gray-900 sm:text-3xl">
          {stats?.likesCount || 0}
        </p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="text-xs text-gray-500">За сутки:</span>
          <span className="text-xs font-medium text-pink-400">
            {stats?.likesTodayCount ? `+${stats.likesTodayCount}` : '+0'}
          </span>
        </div>
      </div>
    </div>
  );
}
