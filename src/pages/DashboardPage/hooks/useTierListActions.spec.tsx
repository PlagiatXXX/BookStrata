/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTierListActions } from './useTierListActions';
import * as apiModule from '@/lib/api';
import { logger } from '@/lib/logger';

// Моки API
vi.mock('@/lib/api', () => ({
  createTierList: vi.fn(),
  updateTierListTitle: vi.fn(),
  deleteTierList: vi.fn(),
}));

// Моки logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Моки alert
const mockAlert = vi.fn();
window.alert = mockAlert;

// Подавляем unhandled rejection от мутаций
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
        onError: () => {
          // Подавляем ошибки мутаций на уровне QueryClient
        },
      },
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTierListActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNewTierList', () => {
    it('должен успешно создавать тир-лист', async () => {
      const mockCreatedTierList = {
        id: 1,
        title: 'New List',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: false,
        user: { id: 1, username: 'testuser' },
        likesCount: 0,
      };

      vi.mocked(apiModule.createTierList).mockResolvedValue(mockCreatedTierList as any);

      const onSuccess = vi.fn();
      const onRefetch = vi.fn();

      const { result } = renderHook(
        () => useTierListActions({ onSuccess, onRefetch }),
        { wrapper: createWrapper() }
      );

      result.current.createNewTierList('New List');

      await vi.waitFor(() => {
        expect(apiModule.createTierList).toHaveBeenCalledWith('New List');
      });

      await vi.waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onRefetch).toHaveBeenCalled();
      });

      expect(logger.info).toHaveBeenCalledWith(
        'New tier list created - navigating to editor',
        expect.objectContaining({
          title: 'New List',
        })
      );
    });

    it('должен показывать ошибку при неудачном создании', async () => {
      vi.mocked(apiModule.createTierList).mockRejectedValue(new Error('Failed to create'));

      const { result } = renderHook(
        () => useTierListActions({}),
        { wrapper: createWrapper() }
      );

      result.current.createNewTierList('New List');

      await vi.waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Ошибка: Failed to create');
      });

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('renameTierList', () => {
    it('должен успешно переименовывать тир-лист', async () => {
      vi.mocked(apiModule.updateTierListTitle).mockResolvedValue({} as any);

      const onSuccess = vi.fn();
      const onRefetch = vi.fn();

      const { result } = renderHook(
        () => useTierListActions({ onSuccess, onRefetch }),
        { wrapper: createWrapper() }
      );

      result.current.renameTierList(1, 'Updated Title');

      await vi.waitFor(() => {
        expect(apiModule.updateTierListTitle).toHaveBeenCalledWith('1', 'Updated Title');
      });

      await vi.waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onRefetch).toHaveBeenCalled();
      });

      expect(logger.info).toHaveBeenCalledWith('Tier list renamed successfully');
    });
  });

  describe('removeTierList', () => {
    it('должен успешно удалять тир-лист', async () => {
      vi.mocked(apiModule.deleteTierList).mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      const onRefetch = vi.fn();

      const { result } = renderHook(
        () => useTierListActions({ onSuccess, onRefetch }),
        { wrapper: createWrapper() }
      );

      result.current.removeTierList(1);

      await vi.waitFor(() => {
        expect(apiModule.deleteTierList).toHaveBeenCalledWith('1');
      });

      await vi.waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onRefetch).toHaveBeenCalled();
      });

      expect(logger.info).toHaveBeenCalledWith('Tier list deleted successfully');
    });
  });

  describe('состояния загрузки', () => {
    it('должен возвращать isCreating=false изначально', () => {
      const { result } = renderHook(
        () => useTierListActions({}),
        { wrapper: createWrapper() }
      );

      expect(result.current.isCreating).toBe(false);
    });

    it('должен возвращать isRenaming=false изначально', () => {
      const { result } = renderHook(
        () => useTierListActions({}),
        { wrapper: createWrapper() }
      );

      expect(result.current.isRenaming).toBe(false);
    });

    it('должен возвращать isDeleting=false изначально', () => {
      const { result } = renderHook(
        () => useTierListActions({}),
        { wrapper: createWrapper() }
      );

      expect(result.current.isDeleting).toBe(false);
    });
  });
});
