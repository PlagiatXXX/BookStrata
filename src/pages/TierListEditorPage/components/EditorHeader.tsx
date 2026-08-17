import { GitFork, ArrowLeft } from "lucide-react";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { forkTierList } from "@/lib/tierListApi";
import { sileo } from "sileo";
import { LikeButton } from "@/components/LikeButton";
import { TierListCover } from "@/components/DashboardHeroSection/components/TierListCover";

export interface EditorHeaderProps {
  title: string;
  author?: { id: number; username: string };
  likesCount?: number;
  initialLiked?: boolean;
  tierListId?: string;
  ownerUserId?: number;
  currentUserId?: number;
  isReadOnly?: boolean;
  /** Демо-режим (без авторизации) */
  isDemo?: boolean;
  hideFork?: boolean;
  coverImageUrl?: string | null;
  booksCount?: number;
  onFork?: () => Promise<void>;
  /** Колбэк для кнопки «На главную» на мобилках */
  onBackClick?: () => void;
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
  isDemo = false,
  hideFork = false,
  coverImageUrl,
  booksCount = 0,
  onFork,
  onBackClick,
}: EditorHeaderProps) => {
  const navigate = useNavigate();
  const [isForking, setIsForking] = useState(false);

  const showAuthPrompt = useCallback(() => {
    sileo.action({
      title: "Создайте свою версию",
      description:
        "Зарегистрируйтесь, чтобы копировать любые тир-листы и редактировать их под себя.",
      duration: 10000,
      button: {
        title: "Создать аккаунт",
        onClick: () => navigate("/auth?mode=register"),
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
          title: "Версия создана",
          description: "Теперь вы можете редактировать этот список под себя",
        });
        navigate(`/tier-lists/${newTierList.slug ?? newTierList.id}`);
      }
    } catch (error) {
      console.error(error);
      sileo.error({
        title: "Ошибка копирования",
        description: "Не удалось создать вашу версию списка",
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
            <h1 className="text-lg font-bold text-(--theme-text)">{title}</h1>
            {author && (
              <button
                onClick={() => navigate(`/users/${author.id}`)}
                className="text-sm text-(--theme-accent-primary) hover:text-(--theme-text) transition-colors cursor-pointer"
              >
                автор: {author.username}
              </button>
            )}
          </div>

          {/* Ряд: обложка | (десктоп: название) | действия */}
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-6">
            {/* Обложка тир-листа (как в редакторе — 7rem) */}
            <div className="shrink-0 max-w-52 w-full">
              <p className="nb-label-xs mb-2 text-(--theme-text-muted) uppercase tracking-wider">
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
              <h1 className="text-lg font-bold text-(--theme-text)">{title}</h1>
              {author && (
                <button
                  onClick={() => navigate(`/users/${author.id}`)}
                  className="text-sm text-(--theme-accent-primary) hover:text-(--theme-text) transition-colors cursor-pointer"
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
                  title={
                    currentUserId
                      ? "Создать свою версию"
                      : "Войдите, чтобы скопировать"
                  }
                >
                  <GitFork size={18} />
                  {isForking ? "Копирую..." : "Своя версия"}
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
        <div>
          {/* Мобилка: absolute кнопка, заголовок строго по центру */}
          <div className="relative">
            {onBackClick && (
              <button
                onClick={onBackClick}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 md:hidden flex items-center gap-1 text-sm text-(--theme-accent-primary) hover:text-(--theme-text) transition-colors cursor-pointer"
                type="button"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h1
              className={`text-center nb-display-lg max-md:text-xl! max-md:leading-tight! max-md:normal-case! text-(--theme-text) wrap-break-word px-4 sm:px-9 min-w-0 max-w-full${isDemo ? " max-md:text-lg!" : ""}`}
            >
              {title}
            </h1>
          </div>
          {isDemo && (
            <span className="block w-fit mx-auto mt-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
              Демо-режим
            </span>
          )}
        </div>
      )}
    </div>
  );
};
