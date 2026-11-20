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
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: commentsKey(slug ?? "") });
      // Синхронизируем счётчик в bookKey (кнопка «N мыслей», SEO), чтобы
      // не приходилось перезагружать страницу после добавления комментария.
      updateBookPageComments(queryClient, slug, (list) => ({
        ...list,
        total: list.total + 1,
        items: result?.comment ? [result.comment, ...list.items] : list.items,
      }));
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
    onSuccess: (result, commentId) => {
      const softDeleted = Boolean(result?.softDeleted);
      if (softDeleted) {
        // Soft delete: комментарий остаётся tombstone'ом, чтобы не ломать ветку ответов.
        updateCommentInCache(queryClient, slug, (c) =>
          c.id === commentId
            ? {
                ...c,
                isDeleted: true,
                content: "Комментарий удалён",
                likesCount: 0,
                user: { id: 0, username: "Пользователь", avatarUrl: null },
              }
            : c,
        );
      } else {
        updateCommentInCache(queryClient, slug, (c) => (c.id === commentId ? null : c));
      }
      // Счётчик total должен уменьшиться в обоих случаях.
      decrementCommentsTotal(queryClient, slug);
      // Синхронизируем bookKey (кнопка «N мыслей», SEO).
      updateBookPageComments(queryClient, slug, (list) => {
        if (softDeleted) {
          return {
            ...list,
            items: list.items.map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    isDeleted: true,
                    content: "Комментарий удалён",
                    likesCount: 0,
                    user: { id: 0, username: "Пользователь", avatarUrl: null },
                  }
                : c,
            ),
            total: Math.max(list.total - 1, 0),
          };
        }
        return {
          ...list,
          items: list.items.filter((c) => c.id !== commentId),
          total: Math.max(list.total - 1, 0),
        };
      });
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

/** Уменьшить total в кэше комментариев (плоский shape { items, total }). */
function decrementCommentsTotal(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string | undefined,
) {
  if (!slug) return;
  queryClient.setQueriesData<{ items: BookComment[]; total: number }>(
    { queryKey: commentsKey(slug) },
    (old) => {
      if (!old) return old;
      return { ...old, total: Math.max(old.total - 1, 0) };
    },
  );
}

/** Обновить блок comments в кэше страницы книги (bookKey). */
function updateBookPageComments(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string | undefined,
  fn: (list: BookPageData["comments"]) => BookPageData["comments"],
) {
  if (!slug) return;
  queryClient.setQueryData<BookPageData>(bookKey(slug), (old) => {
    if (!old) return old;
    return { ...old, comments: fn(old.comments) };
  });
}

/** Обновить комментарий в кэше (или удалить при fn → null). Плоский shape { items, total }. */
function updateCommentInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string | undefined,
  fn: (c: BookComment) => BookComment | null,
) {
  if (!slug) return;
  queryClient.setQueriesData<{ items: BookComment[]; total: number }>(
    { queryKey: commentsKey(slug) },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items
          .map(fn)
          .filter((c): c is BookComment => c !== null),
      };
    },
  );
}
