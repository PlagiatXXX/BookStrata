// src/pages/BookPage/BookComments.tsx
// «Обсуждение» — комментарии книги в стиле арт-деко (геометрические рамки,
// ромбовидные аватары — по reference/code.html). Список с пагинацией
// (useInfiniteQuery), форма добавления, редактирование/удаление своих,
// лайки чужих. Матрица прав — по плану (Фаза 5).
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import {
  useBookComments,
  useCreateBookComment,
  useDeleteBookComment,
  useToggleCommentLike,
  useUpdateBookComment,
} from "@/hooks/useBook";
import type { BookComment as BookCommentType } from "@/lib/bookApi";
import { formatRelativeTime } from "@/utils/timeFormat";

interface BookCommentsProps {
  slug: string;
  /** Первые 10 комментариев из ответа страницы — initialData, без двойного fetch */
  initialItems: BookCommentType[];
  initialTotal: number;
}

export function BookComments({ slug, initialItems, initialTotal }: BookCommentsProps) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBookComments(slug);

  const createComment = useCreateBookComment(slug);
  const updateComment = useUpdateBookComment(slug);
  const deleteComment = useDeleteBookComment(slug);
  const toggleLike = useToggleCommentLike(slug);

  // Комментарии из кэша (если уже подгружены) или initialData из страницы
  const comments =
    data?.pages.flatMap((p) => p.items) ?? initialItems;
  const total = data?.pages[0]?.total ?? initialTotal;

  const currentUserId = user?.userId ?? null;
  const isAdminOrModerator = user?.role === "admin" || user?.role === "moderator";

  const canEdit = (c: BookCommentType) => c.user.id === currentUserId || isAdminOrModerator;
  const canDelete = (c: BookCommentType) => c.user.id === currentUserId || isAdminOrModerator;
  const canLike = (c: BookCommentType) => c.user.id !== currentUserId;

  const submitCreate = () => {
    const content = draft.trim();
    if (!content || createComment.isPending) return;
    createComment.mutate({ content }, { onSuccess: () => setDraft("") });
  };

  const submitEdit = (c: BookCommentType) => {
    const content = editDraft.trim();
    if (!content || updateComment.isPending) return;
    updateComment.mutate(
      { commentId: c.id, content },
      { onSuccess: () => setEditingId(null) },
    );
  };

  return (
    <section className="relative py-16 bg-[var(--bp-background)] border-t border-primary/20">
      <div className="max-w-[1100px] mx-auto px-4 md:px-5">
        <div className="flex items-center justify-between mb-8 border-b border-primary/20 pb-4">
          <h2 className="bp-display text-white tracking-widest uppercase text-xl md:text-2xl">
            Обсуждение <span className="text-[var(--bp-primary)] text-base ml-2">{total}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 flex flex-col gap-6">
            {comments.length === 0 && (
              <p className="text-white/50 text-sm leading-relaxed">
                Пока нет обсуждений. Будьте первым, кто поделится впечатлением о книге.
              </p>
            )}

            {comments.map((c) => (
              <article
                key={c.id}
                className="bp-glass-panel p-6 rounded-none border border-primary/20 shadow-lg relative"
              >
                {/* Геометрические уголки (арт-деко) */}
                <div aria-hidden className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/50" />
                <div aria-hidden className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary/50" />

                <div className="flex gap-4">
                  {/* Ромбовидный аватар */}
                  <div className="w-12 h-12 bg-black/50 border border-primary/40 flex items-center justify-center overflow-hidden shrink-0 rotate-45 transform-gpu mt-2">
                    {c.user.avatarUrl ? (
                      <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover -rotate-45 scale-125" />
                    ) : (
                      <span className="ms-icon text-[var(--bp-primary)] -rotate-45">person</span>
                    )}
                  </div>

                  <div className="flex-1 ml-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="bp-label-caps text-white tracking-widest uppercase">
                        {c.user.username}
                      </h4>
                      <span className="text-[10px] text-primary/60 tracking-widest uppercase">
                        {formatRelativeTime(c.createdAt)}
                        {c.editedAt ? " · ред." : ""}
                      </span>
                    </div>

                    {editingId === c.id ? (
                      <div className="mb-4">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          maxLength={2000}
                          rows={3}
                          className="w-full bg-black/40 border border-primary/30 rounded-lg p-3 text-sm text-white/90 outline-none focus:border-primary transition-colors resize-y"
                        />
                        <div className="flex gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => submitEdit(c)}
                            disabled={updateComment.isPending}
                            className="bp-label-caps bg-[var(--bp-primary)] hover:bg-[var(--bp-primary-container)] text-[var(--bp-on-primary)] px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="bp-label-caps text-white/60 hover:text-white px-4 py-2 transition-colors"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-white/80 leading-relaxed mb-4 text-sm whitespace-pre-wrap">
                        {c.content}
                      </p>
                    )}

                    <div className="flex items-center gap-6">
                      {canLike(c) ? (
                        <button
                          type="button"
                          onClick={() => toggleLike.mutate(c.id)}
                          className="flex items-center gap-2 text-[10px] text-white/40 hover:text-[var(--bp-primary)] transition-colors bp-label-caps"
                        >
                          <span
                            className="ms-icon text-sm"
                            style={{ fontVariationSettings: c.likesCount > 0 ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            favorite
                          </span>
                          {c.likesCount > 0 ? c.likesCount : "Нравится"}
                        </button>
                      ) : (
                        <span className="flex items-center gap-2 text-[10px] text-white/30 bp-label-caps">
                          <span className="ms-icon text-sm">favorite</span>
                          {c.likesCount > 0 ? c.likesCount : "Нравится"}
                        </span>
                      )}

                      {canEdit(c) && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(c.id);
                            setEditDraft(c.content);
                          }}
                          className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition-colors bp-label-caps"
                        >
                          <span className="ms-icon text-sm">edit</span>
                          Редактировать
                        </button>
                      )}

                      {canDelete(c) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Удалить комментарий?")) {
                              deleteComment.mutate(c.id);
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] text-white/40 hover:text-[var(--bp-error)] transition-colors bp-label-caps"
                        >
                          <span className="ms-icon text-sm">delete</span>
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {hasNextPage && (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="self-center bp-label-caps text-[var(--bp-primary)] hover:text-white border border-primary/40 rounded-lg px-6 py-3 transition-colors disabled:opacity-50"
              >
                {isFetchingNextPage ? "Загрузка..." : "Показать ещё"}
              </button>
            )}
          </div>

          {/* Форма добавления — в правой колонке */}
          <div className="md:col-span-4">
            <div className="bp-glass-panel p-6 border border-primary/20 shadow-lg sticky top-24">
              <h3 className="bp-label-caps text-[var(--bp-primary)] tracking-widest uppercase mb-4">
                Ваше мнение
              </h3>
              {user ? (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Поделитесь впечатлением о книге..."
                    maxLength={2000}
                    rows={5}
                    className="w-full bg-black/40 border border-primary/30 rounded-lg p-3 text-sm text-white/90 placeholder-white/30 outline-none focus:border-primary transition-colors resize-y"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-white/30">{draft.length}/2000</span>
                    <button
                      type="button"
                      onClick={submitCreate}
                      disabled={!draft.trim() || createComment.isPending}
                      className="bp-label-caps bg-[var(--bp-primary)] hover:bg-[var(--bp-primary-container)] text-[var(--bp-on-primary)] px-5 py-2.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {createComment.isPending ? "Отправка..." : "Отправить"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/60 leading-relaxed">
                  <Link to="/auth" className="text-[var(--bp-primary)] hover:text-white transition-colors">
                    Войдите
                  </Link>
                  , чтобы оставить комментарий.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
