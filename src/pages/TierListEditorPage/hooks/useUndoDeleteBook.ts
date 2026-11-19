import { useCallback, useEffect, useRef } from "react";
import { sileo } from "sileo";
import type { Book, TierListData } from "@/types";

type PendingDeletedBook = {
  book: Book;
  containerId: string | null;
  index: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

const DELETE_UNDO_DURATION_MS = 3000;

interface UseUndoDeleteBookParams {
  listData: TierListData;
  deleteBook: (bookId: string) => void;
  restoreBook: (book: Book, containerId: string | null, index: number) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  handleDeleteBook: (
    bookId: string,
    options?: { showSuccessToast?: boolean; onError?: () => void },
  ) => void | Promise<void>;
}

export function useUndoDeleteBook({
  listData,
  deleteBook,
  restoreBook,
  setHasUnsavedChanges,
  handleDeleteBook,
}: UseUndoDeleteBookParams) {
  const pendingDeletedBooksRef = useRef<Map<string, PendingDeletedBook>>(new Map());

  const getBookPlacement = useCallback(
    (bookId: string) => {
      for (const tierId of listData.tierOrder) {
        const tier = listData.tiers[tierId];
        const index = tier?.bookIds.indexOf(bookId) ?? -1;
        if (index >= 0) {
          return { containerId: tierId, index };
        }
      }
      const unrankedIndex = listData.unrankedBookIds.indexOf(bookId);
      if (unrankedIndex >= 0) {
        return { containerId: null, index: unrankedIndex };
      }
      return { containerId: null, index: listData.unrankedBookIds.length };
    },
    [listData],
  );

  const undoDeleteBook = useCallback(
    (bookId: string) => {
      const pendingDeletedBook = pendingDeletedBooksRef.current.get(bookId);
      if (!pendingDeletedBook) return;

      clearTimeout(pendingDeletedBook.timeoutId);
      pendingDeletedBooksRef.current.delete(bookId);
      restoreBook(
        pendingDeletedBook.book,
        pendingDeletedBook.containerId,
        pendingDeletedBook.index,
      );
      setHasUnsavedChanges(true);

      sileo.success({
        title: "Удаление отменено",
        duration: 2500,
      });
    },
    [restoreBook, setHasUnsavedChanges],
  );

  const deleteBookWithUnsaved = useCallback(
    (bookId: string) => {
      const book = listData.books[bookId];
      if (!book) return;

      const placement = getBookPlacement(bookId);
      deleteBook(bookId);
      setHasUnsavedChanges(true);

      const timeoutId = setTimeout(() => {
        const pendingDeletedBook = pendingDeletedBooksRef.current.get(bookId);
        if (!pendingDeletedBook) return;

        pendingDeletedBooksRef.current.delete(bookId);
        handleDeleteBook(bookId, {
          showSuccessToast: false,
          onError: () => {
            restoreBook(
              pendingDeletedBook.book,
              pendingDeletedBook.containerId,
              pendingDeletedBook.index,
            );
            setHasUnsavedChanges(true);
          },
        });
      }, DELETE_UNDO_DURATION_MS);

      pendingDeletedBooksRef.current.set(bookId, {
        book,
        containerId: placement.containerId,
        index: placement.index,
        timeoutId,
      });

      sileo.action({
        title: "Книга удалена",
        description: `Удалили "${book.title}"`,
        duration: DELETE_UNDO_DURATION_MS,
        button: {
          title: "Отменить",
          onClick: () => undoDeleteBook(bookId),
        },
      });
    },
    [listData, deleteBook, setHasUnsavedChanges, handleDeleteBook, restoreBook, undoDeleteBook, getBookPlacement],
  );

  const cancelPendingDeletes = useCallback(() => {
    for (const [, pending] of pendingDeletedBooksRef.current) {
      clearTimeout(pending.timeoutId);
    }
    pendingDeletedBooksRef.current.clear();
  }, []);

  // Flush pending deletes при размонтировании
  useEffect(() => {
    const pendingMap = pendingDeletedBooksRef.current;
    return () => {
      for (const [bookId, pending] of pendingMap) {
        clearTimeout(pending.timeoutId);
        handleDeleteBook(bookId, { showSuccessToast: false });
      }
      pendingMap.clear();
    };
  }, [handleDeleteBook]);

  return {
    deleteBookWithUnsaved,
    undoDeleteBook,
    cancelPendingDeletes,
    pendingDeletedBooksRef,
  };
}
