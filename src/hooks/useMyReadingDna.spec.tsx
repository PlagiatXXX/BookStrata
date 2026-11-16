import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const authMock = vi.hoisted(() => ({
  isAuthenticated: true,
}));

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => ({ isAuthenticated: authMock.isAuthenticated }),
}));

vi.mock("@/lib/readingDnaApi", () => ({
  getMyReadingDna: vi.fn(),
}));

import { useMyReadingDna } from "./useMyReadingDna";
import { getMyReadingDna, type ReadingDnaResponseData } from "@/lib/readingDnaApi";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useMyReadingDna", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.isAuthenticated = true;
  });

  it("возвращает null и не делает запрос, если пользователь не авторизован", async () => {
    authMock.isAuthenticated = false;
    const { result } = renderHook(() => useMyReadingDna(), {
      wrapper: createWrapper(),
    });

    expect(result.current.dna).toBeNull();
    expect(getMyReadingDna).not.toHaveBeenCalled();
  });

  it("возвращает данные ДНК для авторизованного пользователя", async () => {
    const mockDna: Partial<ReadingDnaResponseData> = {
      id: 1,
      ticketNumber: "BS-9999-Z",
      archetypeName: "Визионер",
    };
    vi.mocked(getMyReadingDna).mockResolvedValue(mockDna as unknown as ReadingDnaResponseData);

    const { result } = renderHook(() => useMyReadingDna(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dna).toEqual(mockDna);
    expect(result.current.isError).toBe(false);
  });

  it("корректно обрабатывает случай, когда у авторизованного пользователя нет ДНК", async () => {
    vi.mocked(getMyReadingDna).mockResolvedValue(null);

    const { result } = renderHook(() => useMyReadingDna(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dna).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("выставляет флаг isError и сохраняет error при ошибке запроса", async () => {
    const testError = new Error("Network error");
    vi.mocked(getMyReadingDna).mockRejectedValue(testError);

    const { result } = renderHook(() => useMyReadingDna(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(testError);
    expect(result.current.dna).toBeNull();
  });
});
