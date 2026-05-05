import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { createLogger } from '@/lib/logger';
import {
  apiLikeTierList,
  apiUnlikeTierList,
  apiLikeTemplate,
  apiUnlikeTemplate,
  apiGetTierListLikes,
  apiGetTemplateLikes,
  type LikesResponse
} from '@/lib/likesApi';

// Логгер для компонента LikeButton
const logger = createLogger('LikeButton', { color: 'red' });

interface LikeButtonProps {
  id: number | string;
  type: 'tierlist' | 'template';
  initialLikes?: number;
  initialLiked?: boolean;
  authorId?: number;
  currentUserId?: number;
  onLikeChange?: (likes: number, liked: boolean) => void;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function LikeButton({
  id,
  type,
  initialLikes = 0,
  initialLiked = false,
  authorId,
  currentUserId,
  onLikeChange,
  showCount = true,
  size = 'md',
  showLabel = false,
}: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const idStr = String(id);

  // Синхронизируем состояние с props при смене тир-листа/шаблона
  useEffect(() => {
    setLikes(initialLikes);
    setLiked(initialLiked);
  }, [id, initialLikes, initialLiked]);

  const isOwn = authorId !== undefined && currentUserId !== undefined && authorId === currentUserId;
  const isAuthenticated = !!currentUserId;
  const label = liked ? 'Оценено' : 'Оценить';

  const handleLike = async () => {
    if (!isAuthenticated || isLoading) return;
    if (isOwn) return; // Нельзя лайкать своё

    setIsLoading(true);

    // Optimistic update - сразу обновляем локальное состояние
    const previousLiked = liked;
    const previousLikes = likes;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes(liked ? likes - 1 : likes + 1);

    try {
      let response: LikesResponse;

      if (type === 'tierlist') {
        if (liked) {
          response = await apiUnlikeTierList(idStr);
        } else {
          response = await apiLikeTierList(idStr);
        }
      } else {
        if (liked) {
          response = await apiUnlikeTemplate(idStr);
        } else {
          response = await apiLikeTemplate(idStr);
        }
      }

      // Обновляем локальное состояние данными с сервера
      setLikes(response.likesCount);
      setLiked(response.isLiked);
      onLikeChange?.(response.likesCount, response.isLiked);

      // Обновляем кэш likedTierListIds напрямую через setQueryData
      const currentCache = queryClient.getQueryData<{ likedIds: string[] }>(['likedTierListIds']);
      if (currentCache) {
        const newLikedIds = newLiked
          ? [...currentCache.likedIds, idStr]
          : currentCache.likedIds.filter((lid) => lid !== idStr);
        queryClient.setQueryData(['likedTierListIds'], { likedIds: newLikedIds });
      }

      // Также обновляем кэш publicTierLists напрямую
      // Инвалидируем для синхронизации с сервером
      queryClient.invalidateQueries({ queryKey: ['publicTierLists'] });
      queryClient.invalidateQueries({ queryKey: ['publicTierListsSorted'] });
      queryClient.invalidateQueries({ queryKey: ['likedTierListIds'] });
      queryClient.invalidateQueries({ queryKey: ['tierListLikes'] });
    } catch (error) {
      // При ошибке откатываем состояние
      setLiked(previousLiked);
      setLikes(previousLikes);
      logger.error(error as Error, { action: 'like/unlike', type, id });
      // При ошибке "Already liked" обновляем состояние
      if (error instanceof Error && error.message.includes('Already liked')) {
        setLiked(true);
        // Запрашиваем актуальное количество лайков
        try {
          let likesResponse: LikesResponse;
          if (type === 'tierlist') {
            likesResponse = await apiGetTierListLikes(idStr);
          } else {
            likesResponse = await apiGetTemplateLikes(idStr);
          }
          setLikes(likesResponse.likesCount);
        } catch {
          // Игнорируем ошибку при повторном запросе
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const countSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const labelClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const ariaLabel = `${liked ? 'Убрать отметку "Нравится"' : 'Поставить отметку "Нравится"'}. Всего откликов: ${likes}`;

  return (
    <button
      onClick={handleLike}
      disabled={!isAuthenticated || isLoading || isOwn}
      aria-label={ariaLabel}
      aria-pressed={liked}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200
        active:scale-95 focus-visible:ring-2 focus-visible:ring-pink-500 focus:outline-none
        ${liked
          ? 'bg-pink-500/20 text-pink-500'
          : 'bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 text-gray-400 hover:bg-pink-500/10 hover:text-pink-500'
        }
        ${!isAuthenticated || isOwn ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${isLoading ? 'opacity-50' : ''}
      `}
      title={
        !isAuthenticated
          ? 'Войдите, чтобы лайкнуть'
          : isOwn
          ? 'Нельзя лайкнуть свой тир-лист'
          : liked
          ? 'Убрать "Нравится"'
          : 'Поставить "Нравится"'
      }
    >
      {showLabel && (
        <span className={`${labelClasses[size]} font-medium`}>
          {label}
        </span>
      )}
      <motion.div
        animate={liked ? { scale: [1, 1.25, 1.1] } : { scale: 1 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 15 }}
      >
        <Heart
          className={`
            ${sizeClasses[size]}
            transition-all duration-300
            ${liked ? 'fill-current' : ''}
          `}
        />
      </motion.div>
      {showCount && (
        <span className={`${countSizeClasses[size]} font-medium`}>
          {likes}
        </span>
      )}
    </button>
  );
}
