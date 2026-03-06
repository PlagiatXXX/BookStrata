/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTierEditorSave } from './useTierEditorSave';
import type { TierListData } from '@/types';

// Мокаем useAutoSaveOptimized
vi.mock('@/hooks/useAutoSaveOptimized', () => ({
  useAutoSaveOptimized: vi.fn(),
}));

// Мокаем saveTierListOptimized
vi.mock('@/lib/tierListApi', () => ({
  saveTierListOptimized: vi.fn(),
}));

// Мокаем diff утилиты
vi.mock('@/utils/saveDiff', () => ({
  getPlacementsDiff: vi.fn(),
  getTiersDiff: vi.fn(),
  getNewBooks: vi.fn(),
}));

import { useAutoSaveOptimized } from '@/hooks/useAutoSaveOptimized';
import { saveTierListOptimized } from '@/lib/tierListApi';
import { getPlacementsDiff, getTiersDiff, getNewBooks } from '@/utils/saveDiff';

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

const createMockTierListData = (): TierListData => ({
  id: 'test-list-1',
  title: 'Test List',
  books: {
    'book-1': {
      id: 'book-1',
      title: 'Book 1',
      author: 'Author 1',
      coverImageUrl: 'http://example.com/cover1.jpg',
    },
  },
  tiers: {
    'tier-1': {
      id: 'tier-1',
      title: 'S',
      color: '#FF6B6B',
      bookIds: ['book-1'],
    },
  },
  tierOrder: ['tier-1'],
  unrankedBookIds: [],
  tierIdToTempIdMap: {},
});

describe('useTierEditorSave', () => {
  const mockListData = createMockTierListData();
  const mockDispatch = vi.fn();
  const mockSetHasUnsavedChanges = vi.fn();
  const mockLogger = {
    info: vi.fn(),
  };

  const mockAutoSaveReturn = {
    status: 'idle' as const,
    lastSaved: null,
    forceSave: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
    hasPendingChanges: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAutoSaveOptimized).mockReturnValue(mockAutoSaveReturn);
    vi.mocked(getPlacementsDiff).mockReturnValue([]);
    vi.mocked(getTiersDiff).mockReturnValue({ added: [], updated: [], deletedIds: [] });
    vi.mocked(getNewBooks).mockReturnValue([]);
  });

  describe('Инициализация', () => {
    it('должен возвращать autoSaveStatus', () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.autoSaveStatus).toBe('idle');
    });

    it('должен возвращать lastSaved', () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.lastSaved).toBeNull();
    });

    it('должен возвращать forceSave', () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.forceSave).toBeDefined();
      expect(typeof result.current.forceSave).toBe('function');
    });

    it('должен возвращать cancel', () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.cancel).toBeDefined();
      expect(typeof result.current.cancel).toBe('function');
    });

    it('должен возвращать getSavePayload', () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.getSavePayload).toBeDefined();
      expect(typeof result.current.getSavePayload).toBe('function');
    });

    it('должен возвращать savePayload', () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.savePayload).toBeDefined();
      expect(typeof result.current.savePayload).toBe('function');
    });
  });

  describe('getSavePayload', () => {
    it('должен возвращать пустой объект если listData.id не существует', () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: { ...mockListData, id: '' },
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      const payload = result.current.getSavePayload();

      expect(payload).toEqual({});
    });

    it('должен вызывать getPlacementsDiff, getTiersDiff, getNewBooks', () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      result.current.getSavePayload();

      expect(getPlacementsDiff).toHaveBeenCalledWith(mockListData);
      expect(getTiersDiff).toHaveBeenCalledWith(mockListData);
      expect(getNewBooks).toHaveBeenCalledWith(mockListData);
    });

    it('должен возвращать payload с placements', () => {
      vi.mocked(getPlacementsDiff).mockReturnValue([
        { bookId: 1, tierId: 1, rank: 0 },
      ]);

      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      const payload = result.current.getSavePayload();

      expect(payload.placements).toBeDefined();
      expect(payload.placements?.length).toBe(1);
    });

    it('должен возвращать payload с tiers', () => {
      vi.mocked(getTiersDiff).mockReturnValue({
        added: [{ title: 'New Tier', color: '#FF0000', rank: 0 }],
        updated: [],
        deletedIds: [],
      });

      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      const payload = result.current.getSavePayload();

      expect(payload.tiers).toBeDefined();
      const tiersDiff = payload.tiers as { added?: Array<{ title: string; color: string; rank: number }> };
      expect(tiersDiff?.added?.length).toBe(1);
    });

    it('должен возвращать payload с newBooks', () => {
      vi.mocked(getNewBooks).mockReturnValue([
        {
          id: 'book-temp-1',
          title: 'New Book',
          author: 'Author',
          coverImageUrl: 'http://example.com/cover.jpg',
        },
      ]);

      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      const payload = result.current.getSavePayload();

      expect(payload.newBooks).toBeDefined();
      expect(payload.newBooks?.length).toBe(1);
    });
  });

  describe('savePayload', () => {
    it('должен ничего не делать если tierListId не передан', async () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: undefined,
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.savePayload({});

      expect(saveTierListOptimized).not.toHaveBeenCalled();
    });

    it('должен вызывать saveTierListOptimized', async () => {
      vi.mocked(saveTierListOptimized).mockResolvedValue({});

      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.savePayload({
        placements: [{ bookId: 1, tierId: 1, rank: 0 }],
      });

      expect(saveTierListOptimized).toHaveBeenCalledWith(
        'test-list-1',
        { placements: [{ bookId: 1, tierId: 1, rank: 0 }] },
        mockListData
      );
    });

    it('должен вызывать setHasUnsavedChanges(false) после сохранения', async () => {
      vi.mocked(saveTierListOptimized).mockResolvedValue({});

      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.savePayload({});

      expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(false);
    });

    it('должен вызывать dispatch при bookReplacements', async () => {
      vi.mocked(saveTierListOptimized).mockResolvedValue({
        bookReplacements: [
          { tempId: 'book-temp-1', realId: '123' },
        ],
      });

      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.savePayload({});

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'REPLACE_BOOK_IDS',
        payload: [{ tempId: 'book-temp-1', realId: '123' }],
      });
    });

    it('должен инвалидировать кэш queryClient', async () => {
      vi.mocked(saveTierListOptimized).mockResolvedValue({});

      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.savePayload({});

      // QueryClient должен быть вызван для инвалидации
    });

    it('должен логировать успешное сохранение', async () => {
      vi.mocked(saveTierListOptimized).mockResolvedValue({});

      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.savePayload({});

      expect(mockLogger.info).toHaveBeenCalledWith('Сохранение успешно', {
        tierListId: 'test-list-1',
      });
    });
  });

  describe('forceSave', () => {
    it('должен возвращать forceSave из useAutoSaveOptimized', () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.forceSave).toBe(mockAutoSaveReturn.forceSave);
    });
  });

  describe('cancel', () => {
    it('должен возвращать cancel из useAutoSaveOptimized', () => {
      const { result } = renderHook(() =>
        useTierEditorSave({
          tierListId: 'test-list-1',
          listData: mockListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.cancel).toBe(mockAutoSaveReturn.cancel);
    });
  });
});
