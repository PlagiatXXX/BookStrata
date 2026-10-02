// src/pages/AuthorsPage/hooks/useAuthorsPage.ts
import { useQuery } from "@tanstack/react-query";
import { getAllAuthors, type AuthorResult } from "@/lib/authorsApi";

/** Список всех авторов каталога (TanStack Query, кэш по ключу). */
export function useAuthorsPage() {
  return useQuery<AuthorResult[]>({
    queryKey: ["authors"],
    queryFn: getAllAuthors,
  });
}
