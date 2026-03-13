import { useMemo } from 'react';
import { MAX_BOOKS_PER_TIER_LIST } from '@/pages/DashboardPage/constants';

interface UseTierListBooksLimitProps {
  booksCount: number;
  isPro?: boolean;
}

interface UseTierListBooksLimitReturn {
  booksCount: number;
  maxBooks: number;
  remainingBooks: number;
  isAtLimit: boolean;
  progressPercent: number;
  canAddMore: boolean;
  isPro: boolean;
}

/**
 * Хук для отслеживания лимита книг в тир-листе
 * @returns Объект с информацией о лимите книг
 */
export function useTierListBooksLimit({
  booksCount,
  isPro = false,
}: UseTierListBooksLimitProps): UseTierListBooksLimitReturn {
  const maxBooks = isPro ? Infinity : MAX_BOOKS_PER_TIER_LIST;
  const remainingBooks = isPro ? Infinity : Math.max(0, maxBooks - booksCount);
  const isAtLimit = isPro ? false : booksCount >= maxBooks;
  const progressPercent = isPro ? 100 : Math.min(100, Math.round((booksCount / maxBooks) * 100));
  const canAddMore = isPro || !isAtLimit;

  return useMemo(
    () => ({
      booksCount,
      maxBooks: isPro ? Infinity : maxBooks,
      remainingBooks,
      isAtLimit,
      progressPercent,
      canAddMore,
      isPro,
    }),
    [booksCount, isPro, maxBooks, isAtLimit, remainingBooks, progressPercent, canAddMore]
  );
}
