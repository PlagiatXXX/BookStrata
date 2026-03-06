import { LikeButton } from '@/components/LikeButton';
import { AutoSaveIndicator } from './AutoSaveIndicator';
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
      <AutoSaveIndicator
        autoSaveStatus={autoSaveStatus}
        lastSaved={lastSaved}
        onSaveRetry={onSaveRetry}
      />

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
