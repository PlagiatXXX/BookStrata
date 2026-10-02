// Хуки админ-редактора контента страницы автора (TanStack Query)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getAdminAuthorContent,
  listAdminAuthors,
  saveAdminAuthorContent,
  type AuthorContentInput,
} from "@/lib/adminAuthorsApi"
import { listAdminBooks } from "@/lib/adminBooksApi"

/** Список авторов с флагами контента. Запрос — только при пустом запросе
 *  или длине ≥ 2 (один символ не фильтрует ничего полезного). */
export function useAdminAuthorList(q: string) {
  return useQuery({
    queryKey: ["admin", "authors", q],
    queryFn: () => listAdminAuthors(q || undefined),
    enabled: q.length >= 2 || q === "",
  })
}

/** Текущий контент выбранного автора для редактора. */
export function useAdminAuthorContent(id: number | null) {
  return useQuery({
    queryKey: ["admin", "authors", id, "content"],
    queryFn: () => getAdminAuthorContent(id as number),
    enabled: id !== null,
  })
}

/** Книги автора для селекта «Избранные книги» (showcase). */
export function useAdminAuthorBooks(id: number | null) {
  return useQuery({
    queryKey: ["admin", "authors", id, "books"],
    queryFn: () => listAdminBooks({ authorId: id as number, limit: 100 }),
    enabled: id !== null,
  })
}

/** Атомарное сохранение контента + инвалидация кэша списка и контента. */
export function useSaveAuthorContent(id: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: AuthorContentInput) => {
      if (id === null) {
        return Promise.reject(new Error("Автор не выбран"))
      }
      return saveAdminAuthorContent(id, content)
    },
    onSuccess: () => {
      if (id === null) return
      queryClient.invalidateQueries({
        queryKey: ["admin", "authors", id, "content"],
      })
      queryClient.invalidateQueries({ queryKey: ["admin", "authors"] })
    },
  })
}
