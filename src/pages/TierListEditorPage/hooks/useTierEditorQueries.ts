import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTierList, transformApiToState } from '@/lib/tierListApi';
import { apiGetTierListLikes, apiGetLikedTierListIds } from '@/lib/likesApi';
import { getInitialData } from '../_initialData';
import type { TierListData } from '@/types';

const emptyData: TierListData = {
  id: '',
  title: '',
  books: {},
  tiers: {},
  tierOrder: [],
  unrankedBookIds: [],
  isPublic: false,
  tierIdToTempIdMap: {},
};

export interface TierEditorQueriesResult {
  // Данные тир-листа
  apiData: Awaited<ReturnType<typeof fetchTierList>> | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | unknown | null;

  // Лайки
  likesData: Awaited<ReturnType<typeof apiGetTierListLikes>> | null | undefined;
  likedTierListIds: Awaited<ReturnType<typeof apiGetLikedTierListIds>> | undefined;
  likedIdsSet: Set<number>;

  // Начальные данные для useTierList
  initialDataForHook: TierListData;

  // Извлечённые данные
  isPublic: boolean;
}

export function useTierEditorQueries(
  tierListId: string | undefined
): TierEditorQueriesResult {
  // Загрузка данных с сервера
  const {
    data: apiData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['tierList', tierListId],
    queryFn: () => fetchTierList(tierListId!),
    enabled: !!tierListId,
    staleTime: 0,
  });

  // Получаем количество лайков
  const { data: likesData } = useQuery({
    queryKey: ['tierListLikes', tierListId],
    queryFn: () => (tierListId ? apiGetTierListLikes(parseInt(tierListId)) : null),
    enabled: !!tierListId,
  });

  // Получаем все лайкнутые тир-листы
  const { data: likedTierListIds } = useQuery({
    queryKey: ['likedTierListIds'],
    queryFn: () => apiGetLikedTierListIds(),
    staleTime: 5 * 60 * 1000,
  });

  const likedIdsSet = useMemo(
    () => new Set(likedTierListIds?.likedIds || []),
    [likedTierListIds?.likedIds],
  );

  // Трансформация данных (API -> UI)
  const initialDataForHook = useMemo((): TierListData => {
    if (apiData) {
      const data = transformApiToState(apiData);
      if (Object.keys(data.tiers).length === 0) {
        return getInitialData(tierListId!, apiData.title || 'Новый тир-лист');
      }
      return data;
    } else if (isError) {
      return getInitialData(tierListId!, 'Новый тир-лист');
    }
    return emptyData;
  }, [apiData, isError, tierListId]);

  // Получаем isPublic из API данных
  const isPublic = apiData?.isPublic ?? false;

  return {
    apiData,
    isLoading,
    isError,
    error,
    likesData,
    likedTierListIds,
    likedIdsSet,
    initialDataForHook,
    isPublic,
  };
}
