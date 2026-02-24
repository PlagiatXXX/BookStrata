import { LikeButton } from '@/components/LikeButton';
import type { AutoSaveStatus } from '@/hooks/useAutoSaveOptimized';

export interface EditorHeaderProps {
  title: string;
  author?: { username: string };
  likesCount?: number;
  likedIdsSet?: Set<number>;
  tierListId?: string;
  ownerUserId?: number;
  currentUserId?: number;
  autoSaveStatus: AutoSaveStatus;
  lastSaved: Date | null;
  onSaveRetry: () => void;
  isReadOnly?: boolean;
}

export const EditorHeader = ({
  title,
  author,
  likesCount,
  likedIdsSet,
  tierListId,
  ownerUserId,
  currentUserId,
  autoSaveStatus,
  lastSaved,
  onSaveRetry,
  isReadOnly = false,
}: EditorHeaderProps) => {
  return (
    <>
      {/* Индикатор статуса автосохранения */}
      {autoSaveStatus === 'saving' && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-800/90 px-4 py-2 text-sm text-slate-200 shadow-lg backdrop-blur-[2px]">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span>Сохранение...</span>
        </div>
      )}
      {autoSaveStatus === 'saved' && lastSaved && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-800/90 px-4 py-2 text-sm text-slate-400 shadow-lg backdrop-blur-[2px]">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>
            Сохранено {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
      {autoSaveStatus === 'error' && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-[2px]">
          <span>⚠️ Ошибка сохранения</span>
          <button
            onClick={onSaveRetry}
            className="ml-2 rounded bg-white/20 px-2 py-1 text-xs hover:bg-white/30 cursor-pointer"
          >
            Повторить
          </button>
        </div>
      )}

      {/* Заголовок */}
      {isReadOnly ? (
        // Режим просмотра чужого тир-листа (гость): название, автор, лайки
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#e8ffff]">
              {title}
            </h1>
            <p className="mt-1 text-sm text-[#8dc4d2]">
              Автор: {author?.username}
            </p>
          </div>
          <LikeButton
            id={parseInt(tierListId!)}
            type="tierlist"
            initialLikes={likesCount || 0}
            initialLiked={likedIdsSet?.has(parseInt(tierListId!)) || false}
            authorId={ownerUserId}
            currentUserId={currentUserId}
            size="md"
            showLabel={true}
          />
        </div>
      ) : (
        // Режим редактора (владелец): только название
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#e8ffff]">
            {title}
          </h1>
        </div>
      )}
    </>
  );
};
