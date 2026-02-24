import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutoSaveOptimized } from './useAutoSaveOptimized';
import type { SaveTierListPayload } from '@/lib/tierListApi';

// Мокаем logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useAutoSaveOptimized', () => {
  const mockListId = 'test-list-123';
  const mockGetSavePayload = vi.fn();
  const mockSaveFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSavePayload.mockReturnValue({});
    mockSaveFunction.mockResolvedValue(undefined);
  });

  describe('Инициализация', () => {
    it('должен инициализироваться со статусом "idle"', () => {
      const { result } = renderHook(() =>
        useAutoSaveOptimized({
          listId: mockListId,
          getSavePayload: mockGetSavePayload,
          saveFunction: mockSaveFunction,
          enabled: true,
        })
      );

      expect(result.current.status).toBe('idle');
      expect(result.current.lastSaved).toBeNull();
      // hasPendingChanges = true сразу после рендера
      expect(result.current.hasPendingChanges).toBe(true);
    });

    it('не должен автосохраняться если enabled = false', async () => {
      renderHook(() =>
        useAutoSaveOptimized({
          listId: mockListId,
          getSavePayload: mockGetSavePayload,
          saveFunction: mockSaveFunction,
          enabled: false,
        })
      );

      // Ждём немного
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(mockSaveFunction).not.toHaveBeenCalled();
    });

    it('не должен автосохраняться если listId = null', async () => {
      renderHook(() =>
        useAutoSaveOptimized({
          listId: null,
          getSavePayload: mockGetSavePayload,
          saveFunction: mockSaveFunction,
          enabled: true,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 300));

      expect(mockSaveFunction).not.toHaveBeenCalled();
    });
  });

  describe('Сохранение данных', () => {
    it('должен вызывать saveFunction с payload', async () => {
      const mockPayload: SaveTierListPayload = {
        placements: [{ bookId: 1, tierId: 1, rank: 0 }],
      };
      mockGetSavePayload.mockReturnValue(mockPayload);

      renderHook(() =>
        useAutoSaveOptimized({
          listId: mockListId,
          getSavePayload: mockGetSavePayload,
          saveFunction: mockSaveFunction,
          delay: 100,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockSaveFunction).toHaveBeenCalledWith(mockPayload);
      }, { timeout: 5000 });
    });

    it('не должен сохранять если нет изменений', async () => {
      mockGetSavePayload.mockReturnValue({});

      renderHook(() =>
        useAutoSaveOptimized({
          listId: mockListId,
          getSavePayload: mockGetSavePayload,
          saveFunction: mockSaveFunction,
          delay: 100,
          enabled: true,
        })
      );

      // Ждём немного больше чем delay
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(mockSaveFunction).not.toHaveBeenCalled();
    });

    it('должен сохранять placements если они есть', async () => {
      mockGetSavePayload.mockReturnValue({
        placements: [
          { bookId: 1, tierId: 1, rank: 0 },
          { bookId: 2, tierId: 2, rank: 1 },
        ],
      });

      renderHook(() =>
        useAutoSaveOptimized({
          listId: mockListId,
          getSavePayload: mockGetSavePayload,
          saveFunction: mockSaveFunction,
          delay: 100,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockSaveFunction).toHaveBeenCalledTimes(1);
      }, { timeout: 5000 });
    });

    it('должен сохранять tiers если они есть', async () => {
      mockGetSavePayload.mockReturnValue({
        tiers: {
          added: [{ title: 'New Tier', color: '#FF0000', rank: 0 }],
          updated: [],
          deletedIds: [],
        },
      });

      renderHook(() =>
        useAutoSaveOptimized({
          listId: mockListId,
          getSavePayload: mockGetSavePayload,
          saveFunction: mockSaveFunction,
          delay: 100,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockSaveFunction).toHaveBeenCalledTimes(1);
      }, { timeout: 5000 });
    });

    it('должен сохранять newBooks если они есть', async () => {
      mockGetSavePayload.mockReturnValue({
        newBooks: [
          {
            id: 'book-temp-1',
            title: 'New Book',
            author: 'Author',
            coverImageUrl: 'http://example.com/cover.jpg',
          },
        ],
      });

      renderHook(() =>
        useAutoSaveOptimized({
          listId: mockListId,
          getSavePayload: mockGetSavePayload,
          saveFunction: mockSaveFunction,
          delay: 100,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockSaveFunction).toHaveBeenCalledTimes(1);
      }, { timeout: 5000 });
    });
  });

  describe('forceSave', () => {
    it('должен сохранять немедленно без debounce', async () => {
      mockGetSavePayload.mockReturnValue({
        placements: [{ bookId: 1, tierId: 1, rank: 0 }],
      });

      const { result } = renderHook(() =>
        useAutoSaveOptimized({
          listId: mockListId,
          getSavePayload: mockGetSavePayload,
          saveFunction: mockSaveFunction,
          delay: 5000, // Долгий delay
          enabled: true,
        })
      );

      // Вызываем принудительное сохранение
      await result.current.forceSave();

      // Должно сохраниться сразу
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasPendingChanges', () => {
    it('должен устанавливать hasPendingChanges = true при изменениях', () => {
      mockGetSavePayload.mockReturnValue({
        placements: [{ bookId: 1, tierId: 1, rank: 0 }],
      });

      const { result } = renderHook(() =>
        useAutoSaveOptimized({
          listId: mockListId,
          getSavePayload: mockGetSavePayload,
          saveFunction: mockSaveFunction,
          delay: 100,
          enabled: true,
        })
      );

      expect(result.current.hasPendingChanges).toBe(true);
    });
  });
});
