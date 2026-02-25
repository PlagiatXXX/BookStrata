import { Clock, Globe, Lock, Edit2 } from "lucide-react";
import type { TierListShort } from "@/lib/tierListApi";

interface TierListCardProps {
  tierList: TierListShort;
  onRename: (tierList: TierListShort) => void;
  onDelete: (tierList: TierListShort) => void;
  onOpen?: (id: number) => void;
}

export const TierListCard = ({
  tierList,
  onRename,
  onDelete,
  onOpen,
}: TierListCardProps) => {
  const createdDate = new Date(tierList.createdAt);
  const isNew =
    new Date().getTime() - createdDate.getTime() < 24 * 60 * 60 * 1000;

  const handleOpen = () => {
    if (onOpen) {
      onOpen(tierList.id);
    }
  };

  return (
    <div className="group relative bg-linear-to-br from-slate-800/60 to-slate-900/60 dark:from-slate-800/60 dark:to-slate-900/60 light:from-white/80 light:to-gray-100/80 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 dark:border-slate-700/50 light:border-gray-300/50 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-400/20 overflow-hidden">
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-br from-cyan-400/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

      {/* Actions */}
      <div className="absolute top-2 right-2 z-20 flex gap-1 md:opacity-0 md:group-hover:opacity-100 opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRename(tierList);
          }}
          className="p-1 rounded bg-transparent hover:bg-cyan-500/50 text-gray-300 hover:text-white transition-all cursor-pointer border-gray-500/30 hover:border-cyan-400/30"
          title="Переименовать"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(tierList);
          }}
          className="p-1 rounded bg-transparent hover:bg-red-500/50 text-gray-300 hover:text-red-400 transition-all cursor-pointer border-gray-500/30 hover:border-red-400/30"
          title="Удалить"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start gap-2 mb-3">
          <h3
            onClick={handleOpen}
            className="text-xl font-bold text-white dark:text-white light:text-gray-900 light:dark:text-gray-100 group-hover:text-cyan-300 transition-colors line-clamp-2 cursor-pointer"
          >
            {tierList.title}
          </h3>
          {isNew && (
            <span className="inline-block px-3 py-1 bg-linear-to-r from-green-500/80 to-emerald-600/80 text-white text-xs font-semibold rounded-full shrink-0">
              Новый
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-400 light:text-gray-600 light:dark:text-gray-300 mb-4">
          <Clock size={16} />
          <span>
            {createdDate.toLocaleDateString("ru-RU", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap">
          {tierList.isPublic && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 text-blue-300 dark:text-blue-300 light:text-blue-600 light:dark:text-blue-400 text-xs font-medium rounded-full border border-blue-400/30">
              <Globe size={14} />
              Публичный
            </span>
          )}
          {!tierList.isPublic && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-500/20 text-gray-300 dark:text-gray-300 light:text-gray-600 light:dark:text-gray-300 text-xs font-medium rounded-full border border-gray-400/30">
              <Lock size={14} />
              Приватный
            </span>
          )}
        </div>

        {/* Open button */}
        <div className="mt-6 pt-4 border-t border-slate-600/50 dark:border-slate-600/50 light:border-gray-300/50 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
          <button
            onClick={handleOpen}
            className="cursor-pointer w-full px-4 py-2 bg-linear-to-r from-cyan-500/20 to-purple-600/20 hover:from-cyan-500/40 hover:to-purple-600/40 text-cyan-300 font-medium rounded-lg transition-all"
          >
            Открыть
          </button>
        </div>
      </div>

      {/* Hover indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-cyan-400 to-purple-600 transform md:scale-x-0 md:group-hover:scale-x-100 scale-x-100 transition-transform origin-left"></div>
    </div>
  );
};
