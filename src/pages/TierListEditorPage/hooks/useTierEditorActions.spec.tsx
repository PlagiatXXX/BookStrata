/// <reference types="vitest/globals" />

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTierEditorActions } from './useTierEditorActions';
import * as tierListApi from '@/lib/tierListApi';
import { logger } from '@/lib/logger';
import { sileo } from 'sileo';

// Моки для внешних зависимостей
vi.mock('@/lib/tierListApi', () => ({
  toggleTierListPublic: vi.fn(),
  deleteTierList: vi.fn(),
  removeBookFromTierList: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('sileo', () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

describe('useTierEditorActions', () => {
  const mockNavigate = vi.fn();
  const mockDispatch = vi.fn();
  const mockUpdateBook = vi.fn();
  const mockSetHasUnsavedChanges = vi.fn();
  const mockSetDeletedTierIds = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('togglePublic', () => {
    it('должен успешно переключить статус публичности и инвалидировать кэш', async () => {
      vi.mocked(tierListApi.toggleTierListPublic).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      // Переключаем на публичный
      await result.current.togglePublic(true);

      expect(tierListApi.toggleTierListPublic).toHaveBeenCalledWith('123', true);
      expect(sileo.success).toHaveBeenCalledWith({
        title: 'Тир-лист опубликован',
        duration: 3000,
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('должен показать toast при скрытии тир-листа', async () => {
      vi.mocked(tierListApi.toggleTierListPublic).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      // Переключаем на приватный
      await result.current.togglePublic(false);

      expect(tierListApi.toggleTierListPublic).toHaveBeenCalledWith('123', false);
      expect(sileo.success).toHaveBeenCalledWith({
        title: 'Тир-лист скрыт',
        duration: 3000,
      });
    });

    it('должен показать error toast при ошибке API', async () => {
      const mockError = new Error('API error');
      vi.mocked(tierListApi.toggleTierListPublic).mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.togglePublic(true);

      expect(sileo.error).toHaveBeenCalledWith({
        title: 'Не удалось изменить видимость',
        description: 'Попробуйте снова позже',
        duration: 3000,
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('не должен выполнять запрос если tierListId не указан', async () => {
      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: undefined,
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.togglePublic(true);

      expect(tierListApi.toggleTierListPublic).not.toHaveBeenCalled();
      expect(sileo.success).not.toHaveBeenCalled();
    });

    it('должен устанавливать isTogglingPublic во время запроса', async () => {
      let resolvePromise: (value: void) => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(tierListApi.toggleTierListPublic).mockImplementation(() => promise);

      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      // Начинаем переключение
      const togglePromise = result.current.togglePublic(true);

      // Ждём обновления состояния
      await waitFor(() => {
        expect(result.current.isTogglingPublic).toBe(true);
      });

      // Завершаем запрос
      resolvePromise!();
      await togglePromise;

      // Ждём сброса флага
      await waitFor(() => {
        expect(result.current.isTogglingPublic).toBe(false);
      }, { timeout: 1000 });
    });
  });

  describe('handleSaveBook', () => {
    it('должен обновлять книгу локально и устанавливать hasUnsavedChanges', () => {
      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      const bookData = { title: 'New Title', thoughts: 'My thoughts' };
      result.current.handleSaveBook('456', bookData);

      expect(mockUpdateBook).toHaveBeenCalledWith('456', bookData);
      expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(true);
    });

    it('не должен отправлять запрос для книг с temp ID (book-*)', () => {
      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      result.current.handleSaveBook('book-temp-123', { title: 'Temp Book' });

      expect(mockUpdateBook).toHaveBeenCalledWith('book-temp-123', { title: 'Temp Book' });
      expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDeleteBook', () => {
    it('должен удалять книгу с сервера', async () => {
      vi.mocked(tierListApi.removeBookFromTierList).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      result.current.handleDeleteBook('456');

      // Ждём выполнения асинхронного запроса
      await waitFor(() => {
        expect(tierListApi.removeBookFromTierList).toHaveBeenCalledWith('123', '456');
      });
    });

    it('не должен удалять книги с temp ID', () => {
      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      result.current.handleDeleteBook('book-temp-123');

      expect(tierListApi.removeBookFromTierList).not.toHaveBeenCalled();
    });
  });

  describe('handleBookAdded', () => {
    it('должен диспатчить действие ADD_BOOKS', () => {
      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      const book = {
        id: 789,
        title: 'New Book',
        author: 'Author Name',
        coverImageUrl: 'https://example.com/cover.jpg',
      };

      result.current.handleBookAdded(book);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_BOOKS',
        payload: {
          newBooks: [
            {
              id: '789',
              title: 'New Book',
              author: 'Author Name',
              coverImageUrl: 'https://example.com/cover.jpg',
            },
          ],
        },
      });
      expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(true);
    });

    it('не должен диспатчить если book null', () => {
      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      result.current.handleBookAdded(null);

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockSetHasUnsavedChanges).not.toHaveBeenCalled();
    });
  });

  describe('deleteRatingFromServer', () => {
    it('должен удалять тир-лист и перенаправлять на главную', async () => {
      vi.mocked(tierListApi.deleteTierList).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.deleteRatingFromServer();

      expect(tierListApi.deleteTierList).toHaveBeenCalledWith('123');
      expect(mockSetDeletedTierIds).toHaveBeenCalledWith([]);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('должен показать error toast при ошибке удаления', async () => {
      const mockError = new Error('Delete failed');
      vi.mocked(tierListApi.deleteTierList).mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: '123',
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.deleteRatingFromServer();

      expect(sileo.error).toHaveBeenCalledWith({
        title: 'Не удалось удалить тир-лист',
        description: 'Попробуйте снова позже',
        duration: 3000,
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('не должен выполнять запрос если tierListId не указан', async () => {
      const { result } = renderHook(
        () => useTierEditorActions({
          tierListId: undefined,
          dispatch: mockDispatch,
          updateBook: mockUpdateBook,
          deletedTierIds: [],
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          setDeletedTierIds: mockSetDeletedTierIds,
          navigate: mockNavigate,
        }),
        { wrapper: createWrapper() }
      );

      await result.current.deleteRatingFromServer();

      expect(tierListApi.deleteTierList).not.toHaveBeenCalled();
    });
  });
});
