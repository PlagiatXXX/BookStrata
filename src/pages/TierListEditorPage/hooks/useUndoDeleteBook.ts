import { useCallback, useEffect, useRef } from "react";
import { sileo } from "sileo";
import { findBookElement, triggerDustReassemble } from "@/components/DustDelete";
import type { Book, TierListData } from "@/types";

type PendingDeletedBook = {
  book: Book;
  containerId: string | null;
  index: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

const DELETE_UNDO_DURATION_MS = 5000;
const REASSEMBLE_SAFETY_MS = 1200;

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

      requestAnimationFrame(() => {
        const el = findBookElement(bookId);
        if (!el) return;

        let safetyTimer: ReturnType<typeof setTimeout> | null = null;
        const reveal = () => {
          if (safetyTimer) {
            clearTimeout(safetyTimer);
            safetyTimer = null;
          }
          el.style.opacity = "";
        };

        el.style.opacity = "0";
        const started = triggerDustReassemble(
          `book:${bookId}`,
          el.getBoundingClientRect(),
          reveal,
        );

        if (!started) {
          reveal();
          if (typeof el.animate === "function") {
            el.animate(
              [
                { opacity: 0, transform: "translateY(-14px) scale(0.96)" },
                { opacity: 1, transform: "translateY(0) scale(1)" },
              ],
              { duration: 360, easing: "cubic-bezier(0.22, 1.2, 0.36, 1)" },
            );
          }
        } else {
          safetyTimer = setTimeout(reveal, REASSEMBLE_SAFETY_MS);
        }
      });

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
        autopilot: { expand: 10, collapse: DELETE_UNDO_DURATION_MS },
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

  // Fallback-обработчик клика по кнопке Undo в sileo (защита от <a href="#"> внутри <button> и раннего сворачивания)
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (pendingDeletedBooksRef.current.size === 0) return;
      const target = event.target as HTMLElement | null;
      const actionToast = target?.closest?.('[data-sileo-toast][data-state="action"]');
      if (!actionToast) return;

      const btn = actionToast.querySelector("[data-sileo-button]");
      const clickedButtonDirectly = Boolean(target?.closest?.("[data-sileo-button]"));
      let clickedInsideButtonRect = false;
      if (btn) {
        const r = btn.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          clickedInsideButtonRect =
            event.clientX >= r.left - 4 &&
            event.clientX <= r.right + 4 &&
            event.clientY >= r.top - 4 &&
            event.clientY <= r.bottom + 4;
        }
      }

      const isCollapsed = actionToast.getAttribute("data-expanded") === "false";
      if (!clickedButtonDirectly && !clickedInsideButtonRect && !isCollapsed) return;

      // Берём последнюю удалённую книгу (соответствует текущему sileo-default тосту)
      let latestBookId: string | null = null;
      for (const id of pendingDeletedBooksRef.current.keys()) {
        latestBookId = id;
      }
      if (latestBookId) {
        event.preventDefault();
        undoDeleteBook(latestBookId);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [undoDeleteBook]);

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
