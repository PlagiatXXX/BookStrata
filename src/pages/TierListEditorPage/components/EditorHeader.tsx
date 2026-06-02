import { GitFork } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forkTierList } from '@/lib/tierListApi';
import { sileo } from 'sileo';
import { LikeButton } from '@/components/LikeButton';

export interface EditorHeaderProps {
  title: string;
  author?: { id: number; username: string };
  likesCount?: number;
  initialLiked?: boolean;
  tierListId?: string;
  ownerUserId?: number;
  currentUserId?: number;
  isReadOnly?: boolean;
  hideFork?: boolean;
}

export const EditorHeader = ({
  title,
  author,
  likesCount,
  initialLiked,
  tierListId,
  ownerUserId,
  currentUserId,
  isReadOnly = false,
  hideFork = false,
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
    <div className="mb-8 flex flex-col gap-4 border-b-4 border-black pb-4 md:flex-row md:items-end md:justify-center">
      <div className="text-center">
        <h1 className="nb-display-lg text-white">
          {title}
        </h1>
        {isReadOnly && author && (
          <button
            onClick={() => navigate(`/users/${author.id}`)}
            className="nb-label-md mt-2 text-[#c1fffe] hover:text-white transition-colors text-left cursor-pointer"
          >
            Автор: {author.username}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {isReadOnly && (
          <>
            {!hideFork && (
              <button
                onClick={handleFork}
                disabled={isForking}
                className="nb-btn-primary flex items-center gap-2"
              >
                <GitFork size={18} />
                {isForking ? 'Копирую...' : 'Своя версия'}
              </button>
            )}
            <div className="nb-heavy-border bg-black p-2 h-13 flex items-center justify-center">
              <LikeButton
                id={tierListId!}
                type="tierlist"
                initialLikes={likesCount || 0}
                initialLiked={initialLiked || false}
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
  );
};
