import { useQuery } from '@tanstack/react-query';
import { apiGetUserStats } from '@/lib/userApi';

/**
 * Хук для получения статистики пользователя
 * Возвращает количество тир-листов, шаблонов и лайков
 * 
 * @deprecated Использовать напрямую useQuery с apiGetUserStats
 */
export function useUserStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['userStats'],
    queryFn: apiGetUserStats,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
  });

  return {
    stats: data,
    isLoading,
    error,
    tierListsCount: data?.tierListsCount || 0,
    templatesCount: data?.templatesCount || 0,
    likesCount: data?.likesCount || 0,
  };
}
