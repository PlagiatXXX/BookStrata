// src/hooks/useBook.ts
// TanStack Query хуки страницы книги: данные, лайки, комментарии, «В тир-лист».
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sileo } from "sileo";
import {
  addBookToTierList,
  createBookComment,
  deleteBookComment,
  getBook,
  getBookComments,
  toggleBookCommentLike,
  toggleBookLike,
  updateBookComment,
  type BookComment,
  type BookPageData,
} from "@/lib/bookApi";
import { fetchAllMyTierLists } from "@/lib/tierListApi";

const bookKey = (slug: string) => ["book", slug] as const;
const commentsKey = (slug: string) => ["bookComments", slug] as const;

/** Страница книги (published). null — 404. */
export function useBook(slug: string | undefined) {
  return useQuery({
    queryKey: bookKey(slug ?? ""),
    queryFn: () => getBook(slug!),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Комментарии книги (newest first). Показываются 4 последних;
 *  «Показать ещё» запрашивает все (limit = total). Ключ включает limit —
 *  при переключении свежий запрос, при уходе со страницы кэш/стейт сбрасываются. */
export function useBookComments(slug: string | undefined, limit = 4) {
  return useQuery({
    queryKey: [...commentsKey(slug ?? ""), limit],
    queryFn: () => getBookComments(slug!, 0, limit),
    enabled: Boolean(slug),
    staleTime: 60 * 1000,
  });
}

/** Список тир-листов пользователя для кнопки «В тир-лист» (грузится при открытии). */
export function useMyTierLists(enabled: boolean) {
  return useQuery({
    queryKey: ["myTierLists"],
    queryFn: () => fetchAllMyTierLists(),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

/** Лайк/анлайк книги с оптимистичным обновлением кэша. */
export function useToggleBookLike(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => toggleBookLike(slug!),
    onMutate: async () => {
      if (!slug) return;
      await queryClient.cancelQueries({ queryKey: bookKey(slug) });
      const prev = queryClient.getQueryData<BookPageData>(bookKey(slug));
      if (prev) {
        queryClient.setQueryData<BookPageData>(bookKey(slug), {
          ...prev,
          userLike: !prev.userLike,
          book: {
            ...prev.book,
            likesCount: Math.max(prev.book.likesCount + (prev.userLike ? -1 : 1), 0),
          },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (slug && ctx?.prev) {
        queryClient.setQueryData(bookKey(slug), ctx.prev);
      }
    },
  });
}

/** Добавить книгу в тир-лист (кнопка «В тир-лист»). */
export function useAddBookToTierList(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tierListId: string) => addBookToTierList(slug!, tierListId),
    onSuccess: () => {
      sileo.success({ title: "✓ Книга добавлена в тир-лист", duration: 2500 });
      void queryClient.invalidateQueries({ queryKey: ["userTierLists"] });
    },
    onError: (error: Error) => {
      sileo.error({ title: "Не удалось добавить книгу", description: error.message, duration: 3000 });
    },
  });
}

/** Создать комментарий. */
export function useCreateBookComment(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; parentId?: number }) =>
      createBookComment(slug!, input.content, input.parentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey(slug ?? "") });
    },
  });
}

/** Редактировать комментарий (свой или админ). */
export function useUpdateBookComment(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      updateBookComment(slug!, commentId, content),
    onSuccess: (result) => {
      updateCommentInCache(queryClient, slug, (c) =>
        c.id === result.comment.id ? result.comment : c,
      );
    },
  });
}

/** Удалить комментарий (свой или admin/moderator). */
export function useDeleteBookComment(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => deleteBookComment(slug!, commentId),
    onSuccess: (_result, commentId) => {
      updateCommentInCache(queryClient, slug, (c) => (c.id === commentId ? null : c));
    },
  });
}

/** Лайк/анлайк комментария. */
export function useToggleCommentLike(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => toggleBookCommentLike(slug!, commentId),
    onSuccess: (result, commentId) => {
      updateCommentInCache(queryClient, slug, (c) =>
        c.id === commentId ? { ...c, likesCount: result.likesCount } : c,
      );
    },
  });
}

/** Обновить комментарий в кэше (или удалить при fn → null). */
function updateCommentInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string | undefined,
  fn: (c: BookComment) => BookComment | null,
) {
  if (!slug) return;
  queryClient.setQueriesData<{ pages: { items: BookComment[] }[] }>(
    { queryKey: commentsKey(slug) },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items
            .map(fn)
            .filter((c): c is BookComment => c !== null),
        })),
      };
    },
  );
}
