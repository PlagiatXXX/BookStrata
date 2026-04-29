import { useMemo } from 'react';
import type { TierListShort } from '@/lib/tierListApi';
import type { SortOption, FilterOption } from '../types';
import { useTierListSorting } from './useTierListSorting';

interface UseTierListsPaginationOptions {
  allTierLists: TierListShort[];
  searchQuery: string;
  sortOption: SortOption;
  filterOption: FilterOption;
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
  sortOption,
  filterOption,
}: UseTierListsPaginationOptions): UseTierListsPaginationReturn {
  // Фильтрация по поиску и публичности
  const filteredTierLists = useMemo(() => {
    let result = allTierLists;

    // Фильтрация по поиску
    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      result = result.filter((tierList) =>
        tierList.title.toLowerCase().startsWith(normalizedQuery),
      );
    }

    // Фильтрация по публичности
    if (filterOption === 'public') {
      result = result.filter((tierList) => tierList.isPublic);
    } else if (filterOption === 'private') {
      result = result.filter((tierList) => !tierList.isPublic);
    }

    return result;
  }, [allTierLists, searchQuery, filterOption]);

 const { sortedTierLists } = useTierListSorting({
    tierLists: filteredTierLists,
    sortOption,
  });

  return {
    filteredTierLists,
    displayedTierLists: sortedTierLists,
  };
}
