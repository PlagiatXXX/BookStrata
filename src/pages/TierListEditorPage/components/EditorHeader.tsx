import { GitFork } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { forkTierList } from '@/lib/tierListApi';
import { sileo } from 'sileo';
import { LikeButton } from '@/components/LikeButton';
import { TierListCover } from '@/components/DashboardHeroSection/components/TierListCover';

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
  coverImageUrl?: string | null;
  booksCount?: number;
  onFork?: () => Promise<void>;
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
  coverImageUrl,
  booksCount = 0,
  onFork,
}: EditorHeaderProps) => {
  const navigate = useNavigate();
  const [isForking, setIsForking] = useState(false);

  const showAuthPrompt = useCallback(() => {
    sileo.action({
      title: 'Создайте свою версию',
      description: 'Зарегистрируйтесь, чтобы копировать любые тир-листы и редактировать их под себя.',
      duration: 10000,
      button: {
        title: 'Создать аккаунт',
        onClick: () => navigate('/auth?mode=register'),
      },
    });
  }, [navigate]);

  const handleFork = async () => {
    if (!tierListId) return;
    if (!currentUserId) {
      showAuthPrompt();
      return;
    }
    setIsForking(true);
    try {
      if (onFork) {
        await onFork();
      } else {
        const newTierList = await forkTierList(tierListId);
        sileo.success({
          title: 'Версия создана',
          description: 'Теперь вы можете редактировать этот список под себя',
        });
        navigate(`/tier-lists/${newTierList.id}`);
      }
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
    <div className={`${isReadOnly ? "mb-3" : "mb-6 pb-4"}`}>
      {isReadOnly ? (
        /* Read-only */
        <div>
          {/* Мобилка: название над обложкой, под кнопкой «На главную» */}
          <div className="md:hidden text-center mb-4">
            <h1 className="text-lg font-bold text-white">
              {title}
            </h1>
            {author && (
              <button
                onClick={() => navigate(`/users/${author.id}`)}
                className="text-sm text-[#c1fffe] hover:text-white transition-colors cursor-pointer"
              >
                автор: {author.username}
              </button>
            )}
          </div>

          {/* Ряд: обложка | (десктоп: название) | действия */}
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-6">
            {/* Обложка тир-листа (как в редакторе — 7rem) */}
            <div className="shrink-0 max-w-52 w-full">
              <p className="nb-label-xs mb-2 text-[#64748b] uppercase tracking-wider">
                Обложка тир-листа
              </p>
              <TierListCover
                coverImageUrl={coverImageUrl}
                title={title}
                booksCount={booksCount}
                className="tier-list-cover--editor"
              />
            </div>

            {/* Десктоп: название и автор — по центру горизонтали */}
            <div className="hidden min-w-0 flex-1 text-center md:block">
              <h1 className="text-lg font-bold text-white">
                {title}
              </h1>
              {author && (
                <button
                  onClick={() => navigate(`/users/${author.id}`)}
                  className="text-sm text-[#c1fffe] hover:text-white transition-colors cursor-pointer"
                >
                  автор: {author.username}
                </button>
              )}
            </div>

            {/* Действия */}
            <div className="flex items-center gap-3 shrink-0">
              {!hideFork && (
                <button
                  onClick={handleFork}
                  disabled={isForking}
                  className="nb-btn-primary flex items-center gap-1.5"
                  title={currentUserId ? 'Создать свою версию' : 'Войдите, чтобы скопировать'}
                >
                  <GitFork size={18} />
                  {isForking ? 'Копирую...' : 'Своя версия'}
                </button>
              )}
            <LikeButton
              id={tierListId!}
              type="tierlist"
              initialLikes={likesCount || 0}
              initialLiked={initialLiked || false}
              authorId={ownerUserId}
              currentUserId={currentUserId}
              size="sm"
            />
            </div>
          </div>
        </div>
      ) : (
        /* Edit mode: заголовок по центру (без обложки) */
        <h1 className="text-center nb-display-lg text-white">
          {title}
        </h1>
      )}
    </div>
  );
};
