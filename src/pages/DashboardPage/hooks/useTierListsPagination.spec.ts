/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTierListsPagination } from './useTierListsPagination';
import type { TierListShort } from '@/lib/api';

const mockTierLists: TierListShort[] = [
  {
    id: 1,
    title: 'Fantasy Books',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    isPublic: true,
    user: { id: 1, username: 'user1' },
    likesCount: 5,
  },
  {
    id: 2,
    title: 'Sci-Fi Collection',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    isPublic: false,
    user: { id: 1, username: 'user1' },
    likesCount: 10,
  },
  {
    id: 3,
    title: 'Mystery Novels',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    isPublic: true,
    user: { id: 1, username: 'user1' },
    likesCount: 3,
  },
];

describe('useTierListsPagination', () => {
  describe('без поиска', () => {
    it('должен возвращать все тир-листы если searchQuery пустой', () => {
      const { result } = renderHook(() =>
        useTierListsPagination({
          allTierLists: mockTierLists,
          searchQuery: '',
        })
      );

      expect(result.current.filteredTierLists).toHaveLength(3);
      expect(result.current.displayedTierLists).toHaveLength(3);
    });

    it('должен возвращать все тир-листы если searchQuery только пробелы', () => {
      const { result } = renderHook(() =>
        useTierListsPagination({
          allTierLists: mockTierLists,
          searchQuery: '   ',
        })
      );

      expect(result.current.filteredTierLists).toHaveLength(3);
    });
  });

  describe('фильтрация по поиску', () => {
    it('должен фильтровать по началу названия', () => {
      const { result } = renderHook(() =>
        useTierListsPagination({
          allTierLists: mockTierLists,
          searchQuery: 'Fantasy',
        })
      );

      expect(result.current.filteredTierLists).toHaveLength(1);
      expect(result.current.filteredTierLists[0].title).toBe('Fantasy Books');
    });

    it('должен игнорировать регистр при поиске', () => {
      const { result } = renderHook(() =>
        useTierListsPagination({
          allTierLists: mockTierLists,
          searchQuery: 'fantasy',
        })
      );

      expect(result.current.filteredTierLists).toHaveLength(1);
    });

    it('должен искать по точному вхождению в начало', () => {
      const { result } = renderHook(() =>
        useTierListsPagination({
          allTierLists: mockTierLists,
          searchQuery: 'Sci',
        })
      );

      expect(result.current.filteredTierLists).toHaveLength(1);
      expect(result.current.filteredTierLists[0].title).toBe('Sci-Fi Collection');
    });

    it('должен возвращать пустой массив если ничего не найдено', () => {
      const { result } = renderHook(() =>
        useTierListsPagination({
          allTierLists: mockTierLists,
          searchQuery: 'NonExistent',
        })
      );

      expect(result.current.filteredTierLists).toHaveLength(0);
    });

    it('должен находить несколько совпадений', () => {
      const tierListsWithDuplicates: TierListShort[] = [
        { ...mockTierLists[0], title: 'Test List 1' },
        { ...mockTierLists[1], title: 'Test List 2' },
        { ...mockTierLists[2], title: 'Other List' },
      ];

      const { result } = renderHook(() =>
        useTierListsPagination({
          allTierLists: tierListsWithDuplicates,
          searchQuery: 'Test',
        })
      );

      expect(result.current.filteredTierLists).toHaveLength(2);
    });
  });

  describe('displayedTierLists', () => {
    it('должен совпадать с filteredTierLists', () => {
      const { result } = renderHook(() =>
        useTierListsPagination({
          allTierLists: mockTierLists,
          searchQuery: 'Fantasy',
        })
      );

      expect(result.current.displayedTierLists).toEqual(result.current.filteredTierLists);
    });
  });

  describe('edge cases', () => {
    it('должен работать с пустым массивом', () => {
      const { result } = renderHook(() =>
        useTierListsPagination({
          allTierLists: [],
          searchQuery: 'test',
        })
      );

      expect(result.current.filteredTierLists).toHaveLength(0);
    });

    it('должен работать с special characters в поиске', () => {
      const tierListsWithSpecialChars: TierListShort[] = [
        { ...mockTierLists[0], title: 'Test: Special Edition' },
        { ...mockTierLists[1], title: 'Test - Regular' },
      ];

      const { result } = renderHook(() =>
        useTierListsPagination({
          allTierLists: tierListsWithSpecialChars,
          searchQuery: 'Test:',
        })
      );

      expect(result.current.filteredTierLists).toHaveLength(1);
    });
  });
});
