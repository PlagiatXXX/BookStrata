import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { sileo } from "sileo";
import type { TierListData } from "@/types";
import { useUndoDeleteBook } from "./useUndoDeleteBook";

const mockTriggerDustReassemble = vi.fn();

vi.mock("sileo", () => ({
  sileo: {
    action: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/DustDelete", () => ({
  triggerDustReassemble: (...args: unknown[]) =>
    mockTriggerDustReassemble(...args),
  findBookElement: (bookId: string) =>
    document.querySelector(`[data-book-id="${bookId}"]`),
}));

const makeListData = (): TierListData => ({
  id: "tl-1",
  title: "Тестовый тир-лист",
  tierOrder: ["tier-s"],
  tiers: {
    "tier-s": { id: "tier-s", title: "S", color: "#ff0000", bookIds: ["b-1"] },
  },
  unrankedBookIds: [],
  tierIdToTempIdMap: {},
  books: {
    "b-1": {
      id: "b-1",
      title: "Мастер и Маргарита",
      author: "М. Булгаков",
      coverImageUrl: "/cover.jpg",
    },
  },
});

describe("useUndoDeleteBook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockTriggerDustReassemble.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("показывает тост Undo на 5000 мс с autopilot до конца окна и удаляет книгу на сервере после истечения таймера", () => {
    const deleteBook = vi.fn();
    const restoreBook = vi.fn();
    const setHasUnsavedChanges = vi.fn();
    const handleDeleteBook = vi.fn();

    const { result, unmount } = renderHook(() =>
      useUndoDeleteBook({
        listData: makeListData(),
        deleteBook,
        restoreBook,
        setHasUnsavedChanges,
        handleDeleteBook,
      }),
    );

    act(() => {
      result.current.deleteBookWithUnsaved("b-1");
    });

    expect(deleteBook).toHaveBeenCalledWith("b-1");
    expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
    expect(sileo.action).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Книга удалена",
        duration: 5000,
        autopilot: { expand: 10, collapse: 5000 },
      }),
    );

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(handleDeleteBook).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(handleDeleteBook).toHaveBeenCalledWith(
      "b-1",
      expect.objectContaining({ showSuccessToast: false }),
    );

    unmount();
  });

  it("восстанавливает книгу и запускает обратную сборку пыли при нажатии Отменить", () => {
    const deleteBook = vi.fn();
    const restoreBook = vi.fn();
    const setHasUnsavedChanges = vi.fn();
    const handleDeleteBook = vi.fn();

    const bookEl = document.createElement("div");
    bookEl.setAttribute("data-book-id", "b-1");
    document.body.appendChild(bookEl);

    const { result, unmount } = renderHook(() =>
      useUndoDeleteBook({
        listData: makeListData(),
        deleteBook,
        restoreBook,
        setHasUnsavedChanges,
        handleDeleteBook,
      }),
    );

    act(() => {
      result.current.deleteBookWithUnsaved("b-1");
    });

    const actionCall = vi.mocked(sileo.action).mock.calls[0][0];
    act(() => {
      actionCall.button?.onClick();
      vi.advanceTimersByTime(20);
    });

    expect(restoreBook).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b-1" }),
      "tier-s",
      0,
    );
    expect(handleDeleteBook).not.toHaveBeenCalled();
    expect(mockTriggerDustReassemble).toHaveBeenCalledWith(
      "book:b-1",
      expect.anything(),
      expect.any(Function),
    );
    expect(bookEl.style.opacity).toBe("0");

    // Колбэк завершения сборки возвращает видимость обложки
    const onRestored = mockTriggerDustReassemble.mock.calls[0][2] as () => void;
    onRestored();
    expect(bookEl.style.opacity).toBe("");

    unmount();
  });
});
