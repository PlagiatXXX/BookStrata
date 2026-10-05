/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { CollectionItem } from "@/types/collection";

vi.mock("@/lib/collectionsApi", () => ({
  getCollectionBySlug: vi.fn(),
  getCollectionPreviewBySlug: vi.fn(),
}));

import { getCollectionBySlug, getCollectionPreviewBySlug } from "@/lib/collectionsApi";
import { useCollection } from "./useCollection";

const collectionFixture = {
  id: 1,
  slug: "top-fantastic",
  title: "Топ 10 книг фантастики",
  type: "curated",
} as unknown as CollectionItem;

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("грузит коллекцию по slug и сбрасывает isLoading", async () => {
    vi.mocked(getCollectionBySlug).mockResolvedValue(collectionFixture);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useCollection("top-fantastic", false), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.collection).toEqual(collectionFixture);
    expect(getCollectionBySlug).toHaveBeenCalledWith("top-fantastic");
  });

  it("при повторном монтировании отдаёт данные из кэша без повторного запроса (без скелетона)", async () => {
    vi.mocked(getCollectionBySlug).mockResolvedValue(collectionFixture);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = createWrapper(queryClient);

    const first = renderHook(() => useCollection("top-fantastic", false), { wrapper });
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    first.unmount();

    // «Назад» на страницу коллекции — новый mount, как при popstate
    const second = renderHook(() => useCollection("top-fantastic", false), { wrapper });

    expect(second.result.current.isLoading).toBe(false);
    expect(second.result.current.collection).toEqual(collectionFixture);
    expect(getCollectionBySlug).toHaveBeenCalledTimes(1);
  });

  it("preview использует отдельный endpoint и отдельный ключ кэша", async () => {
    vi.mocked(getCollectionPreviewBySlug).mockResolvedValue(collectionFixture);
    vi.mocked(getCollectionBySlug).mockResolvedValue(collectionFixture);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useCollection("top-fantastic", true), {
      wrapper: createWrapper(queryClient),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getCollectionPreviewBySlug).toHaveBeenCalledWith("top-fantastic");
    expect(getCollectionBySlug).not.toHaveBeenCalled();
  });

  it("без slug запрос не выполняется", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useCollection(undefined, false), {
      wrapper: createWrapper(queryClient),
    });

    expect(getCollectionBySlug).not.toHaveBeenCalled();
  });
});
