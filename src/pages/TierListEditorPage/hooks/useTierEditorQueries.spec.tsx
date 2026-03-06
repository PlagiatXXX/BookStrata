/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTierEditorQueries } from './useTierEditorQueries';

// Мокаем API функции
vi.mock('@/lib/tierListApi', () => ({
  fetchTierList: vi.fn(),
  transformApiToState: vi.fn((data) => data),
  saveTierListOptimized: vi.fn(),
}));

vi.mock('@/lib/likesApi', () => ({
  apiGetTierListLikes: vi.fn(),
  apiGetLikedTierListIds: vi.fn(),
}));

vi.mock('../_initialData', async () => {
  const actual = await vi.importActual('../_initialData');
  return {
    ...actual,
    getInitialData: vi.fn((id, title) => ({
      id: id || 'temp-id',
      title: title || 'Новый тир-лист',
      books: {},
      tiers: {},
      tierOrder: [],
      unrankedBookIds: [],
      isPublic: false,
      tierIdToTempIdMap: {},
    })),
  };
});

import { fetchTierList } from '@/lib/tierListApi';
import { apiGetTierListLikes, apiGetLikedTierListIds } from '@/lib/likesApi';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTierEditorQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Инициализация', () => {
    it('должен возвращать isLoading = true при загрузке', () => {
      vi.mocked(fetchTierList).mockReturnValue(new Promise(() => {})); // Вечный promise

      const { result } = renderHook(
        () => useTierEditorQueries('test-list-1'),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('должен возвращать isLoading = false после загрузки', async () => {
      vi.mocked(fetchTierList).mockResolvedValue({
        id: 1,
        title: 'Test List',
        year: null,
        isPublic: false,
        user: { id: 1, username: 'test' },
        tiers: [],
        unrankedBooks: [],
      });

      const { result } = renderHook(
        () => useTierEditorQueries('test-list-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('должен возвращать isError = true при ошибке', async () => {
      vi.mocked(fetchTierList).mockRejectedValue(new Error('Not found'));

      const { result } = renderHook(
        () => useTierEditorQueries('test-list-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Загрузка данных тир-листа', () => {
    it('должен загружать данные тир-листа', async () => {
      const mockData = {
        id: 1,
        title: 'Test List',
        year: null,
        isPublic: false,
        user: { id: 1, username: 'test' },
        tiers: [],
        unrankedBooks: [],
      };

      vi.mocked(fetchTierList).mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useTierEditorQueries('test-list-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.apiData).toBeDefined();
      });

      expect(fetchTierList).toHaveBeenCalledWith('test-list-1');
      expect(result.current.apiData?.title).toBe('Test List');
    });

    it('не должен загружать данные если tierListId не передан', () => {
      renderHook(
        () => useTierEditorQueries(undefined),
        { wrapper: createWrapper() }
      );

      expect(vi.mocked(fetchTierList)).not.toHaveBeenCalled();
    });

    it('должен извлекать isPublic из apiData', async () => {
      vi.mocked(fetchTierList).mockResolvedValue({
        id: 1,
        title: 'Test List',
        year: null,
        isPublic: true,
        user: { id: 1, username: 'test' },
        tiers: [],
        unrankedBooks: [],
      });

      const { result } = renderHook(
        () => useTierEditorQueries('test-list-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isPublic).toBe(true);
      });
    });
  });

  describe('Загрузка лайков', () => {
    it('должен загружать количество лайков', async () => {
      vi.mocked(fetchTierList).mockResolvedValue({
        id: 1,
        title: 'Test List',
        year: null,
        isPublic: false,
        user: { id: 1, username: 'test' },
        tiers: [],
        unrankedBooks: [],
      });

      vi.mocked(apiGetTierListLikes).mockResolvedValue({ likesCount: 42, isLiked: false });

      const { result } = renderHook(
        () => useTierEditorQueries('123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.likesData).toBeDefined();
      });

      expect(apiGetTierListLikes).toHaveBeenCalledWith(123);
    });

    it('не должен загружать лайки если tierListId не передан', () => {
      renderHook(
        () => useTierEditorQueries(undefined),
        { wrapper: createWrapper() }
      );

      expect(apiGetTierListLikes).not.toHaveBeenCalled();
    });

    it('должен загружать список лайкнутых тир-листов', async () => {
      vi.mocked(apiGetLikedTierListIds).mockResolvedValue({ likedIds: [1, 2, 3] });

      const { result } = renderHook(
        () => useTierEditorQueries('test-list-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.likedTierListIds).toBeDefined();
      });

      expect(apiGetLikedTierListIds).toHaveBeenCalled();
    });

    it('должен создавать Set из likedIds', async () => {
      vi.mocked(apiGetLikedTierListIds).mockResolvedValue({ likedIds: [1, 2, 3] });

      const { result } = renderHook(
        () => useTierEditorQueries('test-list-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.likedIdsSet).toBeInstanceOf(Set);
        expect(result.current.likedIdsSet.has(1)).toBe(true);
        expect(result.current.likedIdsSet.has(2)).toBe(true);
        expect(result.current.likedIdsSet.has(3)).toBe(true);
      });
    });
  });

  describe('initialDataForHook', () => {
    it('должен возвращать начальные данные при ошибке', async () => {
      vi.mocked(fetchTierList).mockRejectedValue(new Error('Not found'));

      const { result } = renderHook(
        () => useTierEditorQueries('123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.initialDataForHook.title).toBe('Новый тир-лист');
    });
  });
});
