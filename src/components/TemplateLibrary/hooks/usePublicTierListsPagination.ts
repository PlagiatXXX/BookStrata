import { useMemo } from 'react';
import { PUBLIC_PAGE_SIZE } from '../constants';

interface PaginationMeta {
  totalItems?: number;
  itemCount?: number;
  itemsPerPage?: number;
  totalPages?: number;
  currentPage?: number;
}

interface UsePublicTierListsPaginationOptions {
  meta: PaginationMeta | undefined | null;
  currentPage: number;
}

interface UsePublicTierListsPaginationReturn {
  totalPages: number;
  hasNextPage: boolean;
  pageNumbers: (number | -1)[];
}

/**
 * Хук для управления пагинацией публичных тир-листов
 * Вычисляет количество страниц, кнопки пагинации, доступность навигации
 */
export function usePublicTierListsPagination({
  meta,
  currentPage,
}: UsePublicTierListsPaginationOptions): UsePublicTierListsPaginationReturn {
  // Вычисляем totalPages из метаданных или резервный вариант
  const totalPages = useMemo(() => {
    if (meta?.totalPages !== undefined && meta.totalPages !== null) {
      return meta.totalPages;
    }
    if (meta?.totalItems) {
      return Math.max(1, Math.ceil(meta.totalItems / PUBLIC_PAGE_SIZE));
    }
    return 1;
  }, [meta?.totalPages, meta?.totalItems]);

  // Проверяем, есть ли следующая страница
  const hasNextPage = useMemo(() => {
    return currentPage < totalPages;
  }, [currentPage, totalPages]);

  // Вычисляем номера страниц для отображения
  const pageNumbers = useMemo(() => {
    // Если всего страниц 7 или меньше, показываем все
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: (number | -1)[] = [];

    // Всегда показываем первую страницу
    pages.push(1);

    // Вычисляем диапазон для отображения текущей страницы
    // Показываем ±2 страницы от текущей
    let startPage = Math.max(2, currentPage - 2);
    let endPage = Math.min(totalPages - 1, currentPage + 2);

    // Если мало места между первой и стартом, расширяем начало
    if (startPage - 1 <= 2) {
      startPage = 2;
      endPage = Math.min(totalPages - 1, 5);
    }

    // Если мало места между концом и последней, расширяем конец
    if (totalPages - endPage <= 2) {
      endPage = totalPages - 1;
      startPage = Math.max(2, totalPages - 4);
    }

    // Добавляем многоточие если нужно
    if (startPage > 2) {
      pages.push(-1);
    }

    // Добавляем диапазон страниц
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Добавляем многоточие если нужно
    if (endPage < totalPages - 1) {
      pages.push(-1);
    }

    // Всегда показываем последнюю страницу
    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages]);

  return {
    totalPages,
    hasNextPage,
    pageNumbers,
  };
}
