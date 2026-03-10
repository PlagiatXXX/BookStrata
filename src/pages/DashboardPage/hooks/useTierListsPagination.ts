import { useMemo } from 'react';
import type { TierListShort } from '@/lib/api';
import type { SortOption, FilterOption } from '../types';

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

  // Сортировка
  const displayedTierLists = useMemo(() => {
    const sorted = [...filteredTierLists];

    switch (sortOption) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'title-asc':
        return sorted.sort((a, b) => 
          a.title.localeCompare(b.title)
        );
      case 'likes':
        return sorted.sort((a, b) => 
          (b.likesCount || 0) - (a.likesCount || 0)
        );
      default:
        return sorted;
    }
  }, [filteredTierLists, sortOption]);

  return {
    filteredTierLists,
    displayedTierLists,
  };
}
