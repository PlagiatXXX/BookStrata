import { useCallback, useState } from 'react';
import { sileo } from 'sileo';
import type { NavigateFunction } from 'react-router-dom';
import type { Action } from '@/hooks/useTierList';
import type { Book } from '@/types';
import { deleteTierList, removeBookFromTierList, toggleTierListPublic } from '@/lib/tierListApi';
import { getAuthHeader, handleResponse } from '@/lib/authApi';
import { API_BASE_URL } from '@/lib/config';
import { logger } from '@/lib/logger';

interface UseTierEditorActionsParams {
  tierListId: string | undefined;
  dispatch: React.Dispatch<Action>;
  updateBook: (bookId: string, updates: Partial<Book>) => void;
  deletedTierIds: number[];
  setHasUnsavedChanges: (value: boolean) => void;
  setDeletedTierIds: React.Dispatch<React.SetStateAction<number[]>>;
  navigate: NavigateFunction;
}

interface AddedBookPayload {
  id: number;
  title: string;
  author: string | null;
  coverImageUrl: string;
}

export function useTierEditorActions({
  tierListId,
  dispatch,
  updateBook,
  setHasUnsavedChanges,
  setDeletedTierIds,
  navigate,
}: UseTierEditorActionsParams) {
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [isUpdatingBook, setIsUpdatingBook] = useState(false);

  const togglePublic = useCallback(
    async (isPublic: boolean) => {
      if (!tierListId) return;
      setIsTogglingPublic(true);
      try {
        await toggleTierListPublic(tierListId, isPublic);
        sileo.success({
          title: isPublic ? 'Тир-лист опубликован' : 'Тир-лист скрыт',
          duration: 3000,
        });
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error(String(error)), {
          action: 'toggleTierListPublic',
          tierListId,
        });
        sileo.error({ 
          title: 'Не удалось изменить видимость', 
          description: 'Попробуйте снова позже',
          duration: 3000 
        });
      } finally {
        setIsTogglingPublic(false);
      }
    },
    [tierListId]
  );

  const handleSaveBook = useCallback(
    (bookId: string, data: { title?: string; author?: string; description?: string; thoughts?: string }) => {
      updateBook(bookId, data);
      setHasUnsavedChanges(true);

      if (!tierListId || bookId.startsWith('book-')) return;

      void (async () => {
        setIsUpdatingBook(true);
        try {
          const response = await fetch(`${API_BASE_URL}/tier-lists/${tierListId}/books/${bookId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader(),
            },
            body: JSON.stringify(data),
          });

          await handleResponse(response);
        } catch (error) {
          logger.error(error instanceof Error ? error : new Error(String(error)), {
            action: 'updateBook',
            tierListId,
            bookId,
          });
          sileo.error({ 
            title: 'Не удалось сохранить изменения', 
            description: 'Попробуйте снова позже',
            duration: 3000 
          });
        } finally {
          setIsUpdatingBook(false);
        }
      })();
    },
    [setHasUnsavedChanges, tierListId, updateBook]
  );

  const handleDeleteBook = useCallback(
    (bookId: string) => {
      if (!tierListId || bookId.startsWith('book-')) return;

      void (async () => {
        try {
          await removeBookFromTierList(tierListId, bookId);
        } catch (error) {
          logger.error(error instanceof Error ? error : new Error(String(error)), {
            action: 'removeBookFromTierList',
            tierListId,
            bookId,
          });
          sileo.error({ 
            title: 'Не удалось удалить книгу', 
            description: 'Попробуйте снова позже',
            duration: 3000 
          });
        }
      })();
    },
    [tierListId]
  );

  const handleBookAdded = useCallback((book: AddedBookPayload | null) => {
    if (!book) return;

    dispatch({
      type: 'ADD_BOOKS',
      payload: {
        newBooks: [
          {
            id: String(book.id),
            title: book.title,
            author: book.author || 'Неизвестен',
            coverImageUrl: book.coverImageUrl,
          },
        ],
      },
    });
    setHasUnsavedChanges(true);
  }, [dispatch, setHasUnsavedChanges]);

  const deleteRatingFromServer = useCallback(async () => {
    if (!tierListId) return;

    try {
      await deleteTierList(tierListId);
      setDeletedTierIds([]);
      navigate('/');
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        action: 'deleteTierList',
        tierListId,
      });
      sileo.error({ 
        title: 'Не удалось удалить тир-лист', 
        description: 'Попробуйте снова позже',
        duration: 3000 
      });
    }
  }, [navigate, setDeletedTierIds, tierListId]);

  return {
    togglePublic,
    isTogglingPublic,
    isUpdatingBook,
    handleSaveBook,
    handleDeleteBook,
    handleBookAdded,
    deleteRatingFromServer,
  };
}
