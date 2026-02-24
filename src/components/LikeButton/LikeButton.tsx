import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { 
  apiLikeTierList, 
  apiUnlikeTierList, 
  apiLikeTemplate, 
  apiUnlikeTemplate,
  apiGetTierListLikes,
  apiGetTemplateLikes,
  type LikesResponse 
} from '@/lib/authApi';

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
          response = await apiUnlikeTierList(id as number);
        } else {
          response = await apiLikeTierList(id as number);
        }
      } else {
        if (liked) {
          response = await apiUnlikeTemplate(id as string);
        } else {
          response = await apiLikeTemplate(id as string);
        }
      }

      // Обновляем локальное состояние данными с сервера
      setLikes(response.likesCount);
      setLiked(response.isLiked);
      onLikeChange?.(response.likesCount, response.isLiked);

      // Обновляем кэш likedTierListIds напрямую через setQueryData
      const currentCache = queryClient.getQueryData<{ likedIds: number[] }>(['likedTierListIds']);
      if (currentCache) {
        const newLikedIds = newLiked
          ? [...currentCache.likedIds, Number(id)]
          : currentCache.likedIds.filter((lid) => lid !== Number(id));
        queryClient.setQueryData(['likedTierListIds'], { likedIds: newLikedIds });
      }

      // Также обновляем кэш publicTierLists напрямую
      const publicCache = queryClient.getQueryData<{ data: Array<{ id: number | string; likesCount: number }> }>(['publicTierLists']);
      if (publicCache) {
        const newPublicData = {
          ...publicCache,
          data: publicCache.data.map((item) => {
            if (item.id === id) {
              return { ...item, likesCount: response.likesCount };
            }
            return item;
          }),
        };
        queryClient.setQueryData(['publicTierLists'], newPublicData);
      }

      // Инвалидируем для синхронизации с сервером
      queryClient.invalidateQueries({ queryKey: ['publicTierLists'] });
      queryClient.invalidateQueries({ queryKey: ['likedTierListIds'] });
      queryClient.invalidateQueries({ queryKey: ['tierListLikes'] });
    } catch (error) {
      // При ошибке откатываем состояние
      setLiked(previousLiked);
      setLikes(previousLikes);
      console.error('Failed to like:', error);
      // При ошибке "Already liked" обновляем состояние
      if (error instanceof Error && error.message.includes('Already liked')) {
        setLiked(true);
        // Запрашиваем актуальное количество лайков
        try {
          let likesResponse: LikesResponse;
          if (type === 'tierlist') {
            likesResponse = await apiGetTierListLikes(id as number);
          } else {
            likesResponse = await apiGetTemplateLikes(id as string);
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

  return (
    <button
      onClick={handleLike}
      disabled={!isAuthenticated || isLoading || isOwn}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full transition-all
        ${liked
          ? 'bg-pink-500/20 text-pink-500'
          : 'bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 text-gray-400 hover:bg-pink-500/10 hover:text-pink-500'
        }
        ${!isAuthenticated || isOwn ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${isLoading ? 'opacity-50' : ''}
      `}
      title={!isAuthenticated ? 'Войдите, чтобы лайкнуть' : isOwn ? 'Нельзя лайкнуть своё' : ''}
    >
      {showLabel && (
        <span className={`${labelClasses[size]} font-medium`}>
          {label}
        </span>
      )}
      <Heart
        className={`
          ${sizeClasses[size]}
          transition-all duration-300
          ${liked ? 'fill-current scale-110' : ''}
        `}
      />
      {showCount && (
        <span className={`${countSizeClasses[size]} font-medium`}>
          {likes}
        </span>
      )}
    </button>
  );
}
