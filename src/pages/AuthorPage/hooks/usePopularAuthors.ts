// src/pages/AuthorPage/hooks/usePopularAuthors.ts
import { useQuery } from "@tanstack/react-query";
import { getPopularAuthors, type AuthorResult } from "@/lib/authorsApi";

/**
 * Популярные авторы каталога для блока «Другие авторы» (перелинковка).
 * Общий queryKey с страницей /authors — TanStack переиспользует кэш.
 */
export function usePopularAuthors(limit = 7) {
  return useQuery<AuthorResult[]>({
    queryKey: ["authors", "popular", limit],
    queryFn: () => getPopularAuthors(limit),
    staleTime: 5 * 60_000,
  });
}
