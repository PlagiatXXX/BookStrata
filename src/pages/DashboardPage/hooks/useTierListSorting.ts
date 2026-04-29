import { useMemo } from 'react';
import type { TierListShort } from '@/lib/tierListApi';
import type { SortOption } from '../types';

interface UseTierListSortingOptions {
  tierLists: TierListShort[];
  sortOption: SortOption;
}

interface UseTierListSortingReturn {
  sortedTierLists: TierListShort[];
}

/**
 * Хук для сортировки тир-листов
 * Поддерживает следующие опции сортировки:
 * - newest: сначала новые (по убыванию createdAt)
 * - oldest: сначала старые (по возрастанию createdAt)
 * - title-asc: по названию (A-Я)
 * - likes: по популярности (по убыванию likesCount)
 */
export function useTierListSorting({
  tierLists,
  sortOption,
}: UseTierListSortingOptions): UseTierListSortingReturn {
  const sortedTierLists = useMemo(() => {
    // Создаем копию массива, чтобы не мутировать исходный
    const sorted = [...tierLists];

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
  }, [tierLists, sortOption]);

  return {
    sortedTierLists,
  };
}