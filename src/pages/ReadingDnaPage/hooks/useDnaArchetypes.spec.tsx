import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDnaArchetypes } from "./useDnaArchetypes";
import * as readingDnaApi from "@/lib/readingDnaApi";

vi.mock("@/lib/readingDnaApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/readingDnaApi")>("@/lib/readingDnaApi");
  return {
    ...actual,
    getReadingArchetypes: vi.fn(),
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useDnaArchetypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("возвращает список архетипов из API через TanStack Query", async () => {
    const mockArchetypes = [
      {
        id: "meaning-architect",
        number: 1,
        caste: { id: "mind", name: "Орден Смыслов", sealColor: "#c0c0c8", badgeClass: "" },
        rarity: 7,
        names: { dark: "Архитектор смыслов", craft: "Искатель сути" },
        description: "Интеллектуальная проза",
        quote: "Книга — инструмент",
        specialSign: "Иммунитет к простым сюжетам",
        axisRanges: {
          storyFocus: { min: 78, max: 100 },
          emotionalWeight: { min: 68, max: 92 },
          pace: { min: 63, max: 87 },
          darkness: { min: 48, max: 72 },
          scope: { min: 63, max: 87 },
          complexity: { min: 78, max: 100 },
        },
      },
    ];

    vi.mocked(readingDnaApi.getReadingArchetypes).mockResolvedValueOnce(
      mockArchetypes as readingDnaApi.DnaArchetypeCatalogItem[]
    );

    const { result } = renderHook(() => useDnaArchetypes(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.archetypes).toEqual(mockArchetypes);
    expect(readingDnaApi.getReadingArchetypes).toHaveBeenCalledTimes(1);
  });
});
