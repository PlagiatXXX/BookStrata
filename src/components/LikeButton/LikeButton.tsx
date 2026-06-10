import { useState, useEffect, useRef } from 'react';
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

  // Refs to track confirmed server state (prevents stale closure issues)
  const confirmedLikedRef = useRef(initialLiked);
  const confirmedLikesRef = useRef(initialLikes);

  // Sync refs when initialLiked/initialLikes change
  useEffect(() => {
    confirmedLikedRef.current = initialLiked;
    confirmedLikesRef.current = initialLikes;
  }, [initialLiked, initialLikes]);

  const isOwn = authorId !== undefined && currentUserId !== undefined && authorId === currentUserId;
  const isAuthenticated = !!currentUserId;
  const label = liked ? 'Оценено' : 'Оценить';

  const handleLike = async () => {
    if (!isAuthenticated || isLoading) return;
    if (isOwn) return;

    if (isLoading) return;
    setIsLoading(true);

    // Always read from server-ground-truth: we track the actual server state in ref
    const serverLiked = confirmedLikedRef.current;
    const serverLikes = confirmedLikesRef.current;
    const optimisticLiked = !serverLiked;
    const optimisticLikes = serverLiked ? serverLikes - 1 : serverLikes + 1;
    console.log('[LikeButton] Click: serverLiked=', serverLiked, 'optimisticLiked=', optimisticLiked);

    setLiked(optimisticLiked);
    setLikes(optimisticLikes);

    try {
      let response: LikesResponse;
      if (type === 'tierlist') {
        if (serverLiked) {
          response = await apiUnlikeTierList(idStr);
        } else {
          response = await apiLikeTierList(idStr);
        }
      } else {
        if (serverLiked) {
          response = await apiUnlikeTemplate(idStr);
        } else {
          response = await apiLikeTemplate(idStr);
        }
      }

      confirmedLikedRef.current = response.isLiked;
      confirmedLikesRef.current = response.likesCount;
      setLiked(response.isLiked);
      setLikes(response.likesCount);
      window.ym?.(109755750, 'reachGoal', response.isLiked ? 'like' : 'unlike')
      onLikeChange?.(response.likesCount, response.isLiked);

      // Обновляем кэш likedTierListIds напрямую через setQueryData
      const currentCache = queryClient.getQueryData<{ likedIds: string[] }>(['likedTierListIds']);
      if (Array.isArray(currentCache?.likedIds)) {
        const newLikedIds = optimisticLiked
          ? [...currentCache.likedIds, idStr]
          : currentCache.likedIds.filter((lid) => lid !== idStr);
        queryClient.setQueryData(['likedTierListIds'], { likedIds: newLikedIds });
      }

      queryClient.invalidateQueries({ queryKey: ['publicTierLists'] });
      queryClient.invalidateQueries({ queryKey: ['publicTierListsSorted'] });
      queryClient.invalidateQueries({ queryKey: ['likedTierListIds'] });
      queryClient.invalidateQueries({ queryKey: ['tierListLikes', idStr] });
      queryClient.invalidateQueries({ queryKey: ['templateLikes', idStr] });
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['userTierLists'] });
    } catch (error) {
      setLiked(confirmedLikedRef.current);
      setLikes(confirmedLikesRef.current);
      logger.error(error instanceof Error ? error : new Error(String(error)), { action: 'like/unlike', type, id });
      if (error instanceof Error && error.message.includes('Already liked')) {
        setLiked(true);
        confirmedLikedRef.current = true;
        try {
          let likesResponse: LikesResponse;
          if (type === 'tierlist') {
            likesResponse = await apiGetTierListLikes(idStr);
          } else {
            likesResponse = await apiGetTemplateLikes(idStr);
          }
          setLikes(likesResponse.likesCount);
          confirmedLikesRef.current = likesResponse.likesCount;
        } catch (e) {
          console.error('[LikeButton] Failed to fetch likes after Already liked error:', e);
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
