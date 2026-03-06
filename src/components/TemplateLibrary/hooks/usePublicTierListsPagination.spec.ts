/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePublicTierListsPagination } from './usePublicTierListsPagination';

describe('usePublicTierListsPagination', () => {
  describe('totalPages', () => {
    it('должен использовать totalPages из метаданных', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 5, totalItems: 30 },
          currentPage: 1,
        })
      );

      expect(result.current.totalPages).toBe(5);
    });

    it('должен вычислять totalPages из totalItems если totalPages не указан', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalItems: 30 },
          currentPage: 1,
        })
      );

      // 30 items / 6 per page = 5 pages
      expect(result.current.totalPages).toBe(5);
    });

    it('должен возвращать 1 если метаданные пустые', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: null,
          currentPage: 1,
        })
      );

      expect(result.current.totalPages).toBe(1);
    });

    it('должен возвращать минимум 1 страницу', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalItems: 3 },
          currentPage: 1,
        })
      );

      expect(result.current.totalPages).toBe(1);
    });
  });

  describe('hasNextPage', () => {
    it('должен возвращать true если есть следующая страница', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 5 },
          currentPage: 2,
        })
      );

      expect(result.current.hasNextPage).toBe(true);
    });

    it('должен возвращать false если текущая страница последняя', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 5 },
          currentPage: 5,
        })
      );

      expect(result.current.hasNextPage).toBe(false);
    });

    it('должен возвращать false если текущая страница больше totalPages', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 3 },
          currentPage: 5,
        })
      );

      expect(result.current.hasNextPage).toBe(false);
    });
  });

  describe('pageNumbers - малое количество страниц', () => {
    it('должен показывать все страницы если их <= 7', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 5 },
          currentPage: 3,
        })
      );

      expect(result.current.pageNumbers).toEqual([1, 2, 3, 4, 5]);
    });

    it('должен показывать все страницы если их ровно 7', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 7 },
          currentPage: 4,
        })
      );

      expect(result.current.pageNumbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe('pageNumbers - большое количество страниц', () => {
    it('должен показывать первую и последнюю страницу всегда', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 10 },
          currentPage: 5,
        })
      );

      const pages = result.current.pageNumbers.filter(p => p !== -1);
      expect(pages[0]).toBe(1);
      expect(pages[pages.length - 1]).toBe(10);
    });

    it('должен показывать ±2 страницы от текущей', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 10 },
          currentPage: 5,
        })
      );

      // Ожидаем: 1, 2, 3, 4, 5, ..., 10
      expect(result.current.pageNumbers).toEqual([1, 2, 3, 4, 5, -1, 10]);
    });

    it('должен корректно отображать на первой странице', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 10 },
          currentPage: 1,
        })
      );

      // Ожидаем: 1, 2, 3, 4, 5, ..., 10
      expect(result.current.pageNumbers).toEqual([1, 2, 3, 4, 5, -1, 10]);
    });

    it('должен корректно отображать на последней странице', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 10 },
          currentPage: 10,
        })
      );

      // Ожидаем: 1, ..., 6, 7, 8, 9, 10
      expect(result.current.pageNumbers).toEqual([1, -1, 6, 7, 8, 9, 10]);
    });

    it('должен корректно отображать на второй странице', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 10 },
          currentPage: 2,
        })
      );

      // Ожидаем: 1, 2, 3, 4, 5, ..., 10
      expect(result.current.pageNumbers).toEqual([1, 2, 3, 4, 5, -1, 10]);
    });

    it('должен корректно отображать на предпоследней странице', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 10 },
          currentPage: 9,
        })
      );

      // Ожидаем: 1, ..., 6, 7, 8, 9, 10
      expect(result.current.pageNumbers).toEqual([1, -1, 6, 7, 8, 9, 10]);
    });
  });

  describe('edge cases', () => {
    it('должен работать с totalPages = 1', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 1 },
          currentPage: 1,
        })
      );

      expect(result.current.pageNumbers).toEqual([1]);
      expect(result.current.hasNextPage).toBe(false);
    });

    it('должен работать с totalPages = 2', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 2 },
          currentPage: 1,
        })
      );

      expect(result.current.pageNumbers).toEqual([1, 2]);
      expect(result.current.hasNextPage).toBe(true);
    });

    it('должен работать с totalPages = 8', () => {
      const { result } = renderHook(() =>
        usePublicTierListsPagination({
          meta: { totalPages: 8 },
          currentPage: 4,
        })
      );

      // Ожидаем: 1, 2, 3, 4, 5, ..., 8
      expect(result.current.pageNumbers).toEqual([1, 2, 3, 4, 5, -1, 8]);
    });
  });
});
