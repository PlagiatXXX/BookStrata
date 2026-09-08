// src/features/book-match/hooks/useMatchedBooks.ts
// Хук рекомендаций Book Match: debounce слайдеров + TanStack Query.
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { getMatchedBooks, matchedBooksKey, type MoodParams } from "@/lib/matchApi";

const DEBOUNCE_MS = 400;
const STALE_TIME = 5 * 60 * 1000;

/**
 * Рекомендации под настроение. Запрос уходит через 400мс после
 * последнего движения слайдера; только когда есть ≥1 активная ось.
 * keepPreviousData — старые карточки не мигают при смене настроения.
 */
export function useMatchedBooks(
  mood: MoodParams,
  opts?: { limit?: number; excludeSlug?: string },
) {
  const limit = opts?.limit ?? 3;
  const debouncedMood = useDebounce(mood, DEBOUNCE_MS);

  const hasActiveAxis = Object.values(debouncedMood).some((v) => v !== undefined);

  return useQuery({
    queryKey: matchedBooksKey(debouncedMood, limit, opts?.excludeSlug),
    queryFn: () => getMatchedBooks(debouncedMood, limit, opts?.excludeSlug),
    enabled: hasActiveAxis,
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}
