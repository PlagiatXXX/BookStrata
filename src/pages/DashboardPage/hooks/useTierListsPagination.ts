import { useMemo } from 'react';
import type { TierListShort } from '@/lib/api';

interface UseTierListsPaginationOptions {
  allTierLists: TierListShort[];
  searchQuery: string;
}

interface UseTierListsPaginationReturn {
  filteredTierLists: TierListShort[];
  displayedTierLists: TierListShort[];
}

/**
 * Хук для фильтрации и пагинации тир-листов
 */
export function useTierListsPagination({
  allTierLists,
  searchQuery,
}: UseTierListsPaginationOptions): UseTierListsPaginationReturn {
  // Фильтрация по поиску
  const filteredTierLists = useMemo(() => {
    if (!searchQuery.trim()) return allTierLists;

    const normalizedQuery = searchQuery.toLowerCase().trim();
    return allTierLists.filter((tierList) =>
      tierList.title.toLowerCase().startsWith(normalizedQuery),
    );
  }, [allTierLists, searchQuery]);

  // Для отображения используем отфильтрованный список
  const displayedTierLists = filteredTierLists;

  return {
    filteredTierLists,
    displayedTierLists,
  };
}
