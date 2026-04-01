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

          <div className="flex items-center gap-3">
            <button
              onClick={handleFork}
              disabled={isForking}
              className={`flex items-center gap-2 rounded-lg bg-[#2a162e] px-4 py-2 text-sm font-semibold text-cyan-400 border border-cyan-400/20 hover:bg-[#341b3a] transition-all ${
                isForking ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <GitFork size={18} />
              {isForking ? 'Копирую...' : 'Создать свою версию'}
            </button>
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
