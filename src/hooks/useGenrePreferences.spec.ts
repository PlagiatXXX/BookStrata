// src/hooks/useGenrePreferences.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";

const authState = vi.hoisted(() => ({ isAuthenticated: true }));

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => ({ isAuthenticated: authState.isAuthenticated }),
}));

vi.mock("@/lib/userApi", () => ({
  apiGetGenrePreferences: vi.fn(),
  apiSetGenrePreferences: vi.fn(),
}));

import { apiGetGenrePreferences, apiSetGenrePreferences } from "@/lib/userApi";
import {
  useGenrePreferences,
  useSetGenrePreferences,
  genrePreferencesKey,
} from "./useGenrePreferences";

const mockGet = vi.mocked(apiGetGenrePreferences);
const mockSet = vi.mocked(apiSetGenrePreferences);

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function createWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

describe("useGenrePreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isAuthenticated = true;
  });

  it("не запрашивает предпочтения для гостя", () => {
    authState.isAuthenticated = false;
    const client = createClient();
    renderHook(() => useGenrePreferences(), { wrapper: createWrapper(client) });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it("возвращает жанры залогиненному", async () => {
    mockGet.mockResolvedValue(["fantasy", "horror"]);
    const client = createClient();
    const { result } = renderHook(() => useGenrePreferences(), {
      wrapper: createWrapper(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(["fantasy", "horror"]));
  });
});

describe("useSetGenrePreferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("сохраняет, пишет в кэш и инвалидирует рекомендации", async () => {
    mockSet.mockResolvedValue(["fantasy"]);
    const client = createClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSetGenrePreferences(), {
      wrapper: createWrapper(client),
    });

    await result.current.mutateAsync(["fantasy"]);

    expect(mockSet).toHaveBeenCalledWith(["fantasy"]);
    expect(client.getQueryData(genrePreferencesKey)).toEqual(["fantasy"]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["book-match"] });
  });
});
