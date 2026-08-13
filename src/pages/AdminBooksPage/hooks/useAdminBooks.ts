// src/pages/AdminBooksPage/hooks/useAdminBooks.ts
// Состояние админки каталога книг (Фаза 7): фильтры, таблица, топ по
// просмотрам, модалки редактирования/merge/комментариев. Данные — через
// TanStack Query, мутации — useMutation с инвалидацией.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAdminBooks,
  getAdminBook,
  updateAdminBook,
  publishAdminBook,
  unpublishAdminBook,
  enrichAdminBook,
  mergeAdminBooks,
  getTopViewedBooks,
  listAdminComments,
  updateAdminComment,
  deleteAdminComment,
  type BookUpdateInput,
} from "@/lib/adminBooksApi";

export type StatusFilter = "all" | "published" | "draft";

export function useAdminBooks() {
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [genre, setGenre] = useState("");
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [sort, setSort] = useState("updatedAt");
  const [offset, setOffset] = useState(0);
  const pageSize = 50;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [mergeBook, setMergeBook] = useState<{ id: number; title: string } | null>(null);
  const [commentsBook, setCommentsBook] = useState<{ id: number; title: string } | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-books", q, status, genre, duplicatesOnly, sort, offset],
    queryFn: () =>
      listAdminBooks({
        q: q || undefined,
        status: status === "all" ? undefined : status,
        genre: genre || undefined,
        duplicatesOnly,
        sort,
        offset,
        limit: pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  const topViewsQuery = useQuery({
    queryKey: ["admin-books-top-views"],
    queryFn: () => getTopViewedBooks(10),
  });

  const detailQuery = useQuery({
    queryKey: ["admin-book", editingId],
    queryFn: () => (editingId !== null ? getAdminBook(editingId) : Promise.resolve(null)),
    enabled: editingId !== null,
  });

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-books"] });
    queryClient.invalidateQueries({ queryKey: ["admin-book"] });
    queryClient.invalidateQueries({ queryKey: ["admin-books-top-views"] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: BookUpdateInput }) =>
      updateAdminBook(id, patch),
    onSuccess: () => {
      invalidateLists();
      setEditingId(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => publishAdminBook(id),
    onSuccess: () => invalidateLists(),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: number) => unpublishAdminBook(id),
    onSuccess: () => invalidateLists(),
  });

  const enrichMutation = useMutation({
    mutationFn: (id: number) => enrichAdminBook(id),
    onSuccess: () => {
      invalidateLists();
      queryClient.invalidateQueries({ queryKey: ["admin-book", editingId] });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: ({ dupId, targetId }: { dupId: number; targetId: number }) =>
      mergeAdminBooks(dupId, targetId),
    onSuccess: () => {
      invalidateLists();
      setMergeBook(null);
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["admin-book-comments", commentsBook?.id],
    queryFn: () =>
      commentsBook
        ? listAdminComments({ bookId: commentsBook.id, limit: 100 })
        : Promise.resolve({ items: [], total: 0 }),
    enabled: commentsBook !== null,
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      updateAdminComment(id, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-book-comments"] }),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => deleteAdminComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-book-comments"] }),
  });

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const item of listQuery.data?.items ?? []) {
      if (item.genre) set.add(item.genre);
    }
    return Array.from(set).sort();
  }, [listQuery.data]);

  return {
    // список
    items: listQuery.data?.items ?? [],
    total: listQuery.data?.total ?? 0,
    loading: listQuery.isLoading,
    q, setQ,
    status, setStatus,
    genre, setGenre,
    duplicatesOnly, setDuplicatesOnly,
    sort, setSort,
    offset, setOffset,
    pageSize,
    genres,
    // топ просмотров
    topViews: topViewsQuery.data?.items ?? [],
    topViewsLoading: topViewsQuery.isLoading,
    // редактирование
    editingId, setEditingId,
    detail: detailQuery.data ?? null,
    detailLoading: detailQuery.isLoading,
    saveMutation,
    publishMutation,
    unpublishMutation,
    enrichMutation,
    // merge
    mergeBook, setMergeBook,
    mergeMutation,
    // комментарии
    commentsBook, setCommentsBook,
    comments: commentsQuery.data?.items ?? [],
    commentsLoading: commentsQuery.isLoading,
    updateCommentMutation,
    deleteCommentMutation,
  };
}
