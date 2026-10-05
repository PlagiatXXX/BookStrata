import { useQuery } from "@tanstack/react-query";
import { getCollectionBySlug, getCollectionPreviewBySlug } from "@/lib/collectionsApi";
import type { CollectionItem } from "@/types/collection";

/** Кэш живёт 5 минут — при back/forward коллекция отдаётся без скелетона */
const COLLECTION_STALE_TIME_MS = 5 * 60 * 1000;

interface UseCollectionResult {
  /** undefined — ещё не загружено, null — не найдено (404) */
  collection: CollectionItem | null | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Коллекция по slug через TanStack Query.
 * При повторном монтировании (back с другой страницы) данные берутся из кэша
 * сразу — без скелетона, поэтому scroll restoration успевает отработать
 * на полном документе.
 */
export function useCollection(
  slug: string | undefined,
  isPreview: boolean,
): UseCollectionResult {
  const query = useQuery({
    queryKey: ["collection", slug, { preview: isPreview }],
    queryFn: () =>
      isPreview
        ? getCollectionPreviewBySlug(slug!)
        : getCollectionBySlug(slug!),
    enabled: !!slug,
    staleTime: COLLECTION_STALE_TIME_MS,
    retry: 1,
  });

  return {
    collection: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
