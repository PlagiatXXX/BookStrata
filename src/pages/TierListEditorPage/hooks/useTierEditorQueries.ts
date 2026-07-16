import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTierList, transformApiToState } from '@/lib/tierListApi';
import { getCollectionBySlug } from '@/lib/collectionsApi';
import { apiGetTierListLikes, apiGetLikedTierListIds } from '@/lib/likesApi';
import { getInitialData } from '../_initialData';
import type { TierListData, Book, Tier } from '@/types';

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

function collectionToTierListData(
  collection: NonNullable<Awaited<ReturnType<typeof getCollectionBySlug>>>,
  readIds?: string[],
): TierListData {
  const idMap = new Map<string, string>();

  // Если передан readIds — форкаем только отмеченные книги
  const readIdsSet = readIds?.length ? new Set(readIds) : null;

  // Префикс "fork-" гарантирует, что бэкенд создаст книги как новые (temp-IDs)
  const books: Record<string, Book> = {};
  Object.entries(collection.books || {}).forEach(([origId, book]) => {
    // Если фильтруем по readIds — пропускаем неотмеченные
    if (readIdsSet && !readIdsSet.has(origId)) return;
    const tempId = `fork-${origId}`;
    idMap.set(origId, tempId);
    books[tempId] = { ...book, id: tempId };
  });

  // То же для tier ID — префикс "fork-" чтобы бэкенд создал новые тиры
  const tierIdToTempIdMap: Record<string, string> = {};
  const tiers: Record<string, Tier> = {};
  Object.entries(collection.tiers || {}).forEach(([origTierId, tier]) => {
    const tempTierId = `fork-${origTierId}`;
    tierIdToTempIdMap[origTierId] = tempTierId;
    tiers[tempTierId] = {
      ...tier,
      bookIds: tier.bookIds
        .map((bookId) => idMap.get(bookId))
        .filter((id): id is string => !!id),
    };
  });

  return {
    tierIdToTempIdMap,
    id: `fork-${collection.slug}`,
    title: collection.title,
    books,
    tiers,
    tierOrder: (collection.tierOrder || []).map((id) => `fork-${id}`),
    unrankedBookIds: (collection.unrankedBookIds || [])
      .map((bookId) => idMap.get(bookId))
      .filter((id): id is string => !!id),
    isPublic: false,
  };
}

export interface TierEditorQueriesResult {
  // Данные тир-листа
  apiData: Awaited<ReturnType<typeof fetchTierList>> | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | unknown | null;

  // Лайки
  likesData: Awaited<ReturnType<typeof apiGetTierListLikes>> | null | undefined;
  likedTierListIds: Awaited<ReturnType<typeof apiGetLikedTierListIds>> | undefined;
  likedIdsSet: Set<string>;

  // Начальные данные для useTierList
  initialDataForHook: TierListData;

  // Извлечённые данные
  isPublic: boolean;
}

export function useTierEditorQueries(
  tierListId: string | undefined,
  forkSlug?: string | null,
  forkReadIds?: string[] | null,
): TierEditorQueriesResult {
  const isNew = tierListId === "new";

  // Загрузка данных с сервера (только если не "new")
  const {
    data: apiData,
    isLoading: isTierListLoading,
    isError: isTierListError,
    error,
  } = useQuery({
    queryKey: ['tierList', tierListId],
    queryFn: () => fetchTierList(tierListId!),
    enabled: !!tierListId && !isNew,
    staleTime: 0,
  });

  // Загрузка коллекции для форка (только если "new" + forkSlug)
  const {
    data: forkCollection,
    isLoading: isForkLoading,
    isError: isForkError,
  } = useQuery({
    queryKey: ['forkCollection', forkSlug],
    queryFn: () => getCollectionBySlug(forkSlug!),
    enabled: isNew && !!forkSlug,
    staleTime: 60_000,
  });

  // При пререндере не делаем запросы, требующие авторизации
  const isPrerender = typeof window !== 'undefined' && window.__PRERENDER__ === true;

  // Получаем количество лайков
  const { data: likesData } = useQuery({
    queryKey: ['tierListLikes', tierListId],
    queryFn: () => (tierListId ? apiGetTierListLikes(tierListId) : null),
    enabled: !!tierListId && !isNew && !isPrerender,
  });

  // Получаем все лайкнутые тир-листы
  const { data: likedTierListIds } = useQuery({
    queryKey: ['likedTierListIds'],
    queryFn: () => apiGetLikedTierListIds(),
    staleTime: 5 * 60 * 1000,
    enabled: !isPrerender,
  });

  const likedIdsSet = useMemo(
    () => new Set(likedTierListIds?.likedIds || []),
    [likedTierListIds?.likedIds],
  );

  // Трансформация данных (API -> UI)
  const initialDataForHook = useMemo((): TierListData => {
    // Форк из коллекции
    if (isNew && forkCollection) {
      return collectionToTierListData(forkCollection, forkReadIds ?? undefined);
    }
    // Новый пустой тир-лист
    if (isNew) {
      return getInitialData(tierListId!, 'Новый тир-лист');
    }
    // Загруженные данные
    if (apiData) {
      const data = transformApiToState(apiData);
      if (Object.keys(data.tiers).length === 0) {
        return getInitialData(tierListId!, apiData.title || 'Новый тир-лист');
      }
      return data;
    } else if (isTierListError) {
      return getInitialData(tierListId!, 'Новый тир-лист');
    }
    return emptyData;
  }, [apiData, isTierListError, tierListId, isNew, forkCollection, forkReadIds]);

  const isLoading = isNew ? isForkLoading : isTierListLoading;
  const isError = isNew ? isForkError : isTierListError;

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
