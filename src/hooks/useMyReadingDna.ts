// src/hooks/useMyReadingDna.ts
// TanStack Query хук для получения Книжного ДНК текущего авторизованного пользователя.

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuthContext";
import { getMyReadingDna, type ReadingDnaResponseData } from "@/lib/readingDnaApi";

export const READING_DNA_ME_QUERY_KEY = ["reading-dna", "me"] as const;

export function useMyReadingDna() {
  const { isAuthenticated } = useAuth();

  const query = useQuery<ReadingDnaResponseData | null>({
    queryKey: READING_DNA_ME_QUERY_KEY,
    queryFn: getMyReadingDna,
    enabled: Boolean(isAuthenticated),
    staleTime: 5 * 60 * 1000, // 5 минут
  });

  return {
    dna: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
