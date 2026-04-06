import { GitFork } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forkTierList } from '@/lib/api';
import { sileo } from 'sileo';
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
  onFork?: () => void;
  isForking?: boolean;
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
  const navigate = useNavigate();
  const [isForking, setIsForking] = useState(false);

  const handleFork = async () => {
    if (!tierListId) return;
    try {
      setIsForking(true);
      const newTierList = await forkTierList(tierListId);
      sileo.success({
        title: 'Версия создана',
        description: 'Теперь вы можете редактировать этот список под себя',
      });
      navigate(`/tier-lists/${newTierList.id}`);
    } catch (error) {
      console.error(error);
      sileo.error({
        title: 'Ошибка копирования',
        description: 'Не удалось создать вашу версию списка',
      });
    } finally {
      setIsForking(false);
    }
  };

  return (
    <>
      <AutoSaveIndicator
        autoSaveStatus={autoSaveStatus}
        lastSaved={lastSaved}
        onSaveRetry={onSaveRetry}
      />

      <div className="mb-8 flex items-end justify-between border-b-4 border-black pb-4">
        <div>
          <h1 className="nb-display-lg text-white">
            {title}
          </h1>
          {isReadOnly && (
            <p className="nb-label-md mt-2 text-[#c1fffe]">
              Автор: {author?.username}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isReadOnly && (
            <>
              <button
                onClick={handleFork}
                disabled={isForking}
                className="nb-btn-primary flex items-center gap-2"
              >
                <GitFork size={18} />
                {isForking ? 'Копирую...' : 'Своя версия'}
              </button>
              <div className="nb-heavy-border bg-black p-2 h-[52px] flex items-center justify-center">
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
            </>
          )}
        </div>
      </div>
    </>
  );
};
