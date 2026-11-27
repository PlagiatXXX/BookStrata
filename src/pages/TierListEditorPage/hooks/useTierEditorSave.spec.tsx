/// <reference types="vitest/globals" />

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTierEditorSave } from "./useTierEditorSave";
import * as tierListApi from "@/lib/tierListApi";
import type { TierListData } from "@/types";

vi.mock("@/lib/tierListApi", () => ({
  createTierList: vi.fn(),
  saveTierListAtomic: vi.fn(),
  updateTierListTheme: vi.fn(),
}));

vi.mock("sileo", () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useTierEditorSave", () => {
  const mockDispatch = vi.fn();
  const mockSetHasUnsavedChanges = vi.fn();
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const initialListData: TierListData = {
    id: "temp-draft-id",
    title: "Тестовый список",
    tierIdToTempIdMap: {},
    tiers: {
      "tier-1": {
        id: "tier-1",
        title: "S",
        color: "#ff7f7f",
        bookIds: ["book-1"],
      },
    },
    tierOrder: ["tier-1"],
    books: {
      "book-1": {
        id: "book-1",
        title: "Книга 1",
        author: "Автор 1",
        coverImageUrl: "https://example.com/cover.jpg",
      },
    },
    unrankedBookIds: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("вызывает onFirstSaveSuccess при успешном создании нового тир-листа", async () => {
    const onFirstSaveSuccess = vi.fn();
    const onTierListCreated = vi.fn();

    vi.mocked(tierListApi.createTierList).mockResolvedValueOnce({
      id: "101",
      slug: "test-slug-101",
      title: "Тестовый список",
      description: null,
      coverImageUrl: null,
      theme: "default",
      tiers: [],
    } as any);

    vi.mocked(tierListApi.saveTierListAtomic).mockResolvedValueOnce({
      bookReplacements: [],
      tierReplacements: [],
    });

    const { result } = renderHook(
      () =>
        useTierEditorSave({
          tierListId: "new",
          listData: initialListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger as any,
          onFirstSaveSuccess,
          onTierListCreated,
        }),
      { wrapper: createWrapper() }
    );

    let saveResult = false;
    await act(async () => {
      saveResult = await result.current.handleSave();
    });

    expect(saveResult).toBe(true);
    expect(tierListApi.createTierList).toHaveBeenCalledTimes(1);
    expect(onTierListCreated).toHaveBeenCalledWith("101");
    expect(onFirstSaveSuccess).toHaveBeenCalledWith("/tier-lists/test-slug-101");
  });

  it("НЕ вызывает onFirstSaveSuccess при повторном сохранении существующего тир-листа (числовой id)", async () => {
    const onFirstSaveSuccess = vi.fn();

    vi.mocked(tierListApi.saveTierListAtomic).mockResolvedValueOnce({
      bookReplacements: [],
      tierReplacements: [],
    });

    const existingListData: TierListData = {
      ...initialListData,
      id: "101",
    };

    const { result } = renderHook(
      () =>
        useTierEditorSave({
          tierListId: "101",
          listData: existingListData,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger as any,
          onFirstSaveSuccess,
        }),
      { wrapper: createWrapper() }
    );

    let saveResult = false;
    await act(async () => {
      saveResult = await result.current.handleSave();
    });

    expect(saveResult).toBe(true);
    expect(tierListApi.createTierList).not.toHaveBeenCalled();
    expect(tierListApi.saveTierListAtomic).toHaveBeenCalledTimes(1);
    expect(onFirstSaveSuccess).not.toHaveBeenCalled();
  });

  it("сбрасывает deletedBookIds после успешного сохранения", async () => {
    vi.mocked(tierListApi.saveTierListAtomic).mockResolvedValueOnce({
      bookReplacements: [],
      tierReplacements: [],
    });

    const listWithDeleted: TierListData = {
      ...initialListData,
      id: "101",
      deletedBookIds: [777],
    };

    const { result } = renderHook(
      () =>
        useTierEditorSave({
          tierListId: "101",
          listData: listWithDeleted,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger as any,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockDispatch).toHaveBeenCalledWith({ type: "CLEAR_DELETED_BOOK_IDS" });
  });

  it("удаляет призрачные книги из состояния при missingBookIds в ответе", async () => {
    vi.mocked(tierListApi.saveTierListAtomic).mockResolvedValueOnce({
      bookReplacements: [],
      tierReplacements: [],
      missingBookIds: [999],
    });

    const listWithGhost: TierListData = {
      ...initialListData,
      id: "101",
      books: {
        "200": { id: "200", title: "Живая", author: "A", coverImageUrl: "u" },
        "999": { id: "999", title: "Призрак", author: "B", coverImageUrl: "u" },
      },
      tiers: {
        "10": { id: "10", title: "S", color: "#fff", bookIds: ["200", "999"] },
      },
      tierOrder: ["10"],
      unrankedBookIds: [],
    };

    const { result } = renderHook(
      () =>
        useTierEditorSave({
          tierListId: "101",
          listData: listWithGhost,
          dispatch: mockDispatch,
          isLoading: false,
          isReadOnly: false,
          setHasUnsavedChanges: mockSetHasUnsavedChanges,
          logger: mockLogger as any,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "PRUNE_MISSING_BOOKS",
      payload: [999],
    });
  });
});
