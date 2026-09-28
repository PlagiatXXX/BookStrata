// src/pages/AuthorPage/hooks/useAuthorPage.ts
import { useQuery } from "@tanstack/react-query";
import { getAuthorBySlug, type AuthorPageData } from "@/lib/authorsApi";

/** Данные страницы автора /authors/:slug (TanStack Query, кэш по slug). */
export function useAuthorPage(slug?: string) {
  return useQuery<AuthorPageData>({
    queryKey: ["author", slug],
    queryFn: () => getAuthorBySlug(slug as string),
    enabled: Boolean(slug),
  });
}
