// src/pages/BookPage/BookComments.tsx
// «Обсуждение» — комментарии книги в стиле арт-деко (геометрические рамки,
// ромбовидные аватары — по reference/code.html). Список с пагинацией
// (useInfiniteQuery), форма добавления, редактирование/удаление своих,
// лайки чужих. Матрица прав — по плану (Фаза 5).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { Icon } from "@/components/Icon";
import {
  useBookComments,
  useCreateBookComment,
  useDeleteBookComment,
  useToggleCommentLike,
  useUpdateBookComment,
} from "@/hooks/useBook";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
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
  // Комментарий, ожидающий подтверждения удаления (модалка вместо window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<BookCommentType | null>(null);
  // Лимит списка: 4 последних; «Показать ещё» выставляет total (все).
  // State живёт в компоненте — при уходе со страницы сбрасывается на 4.
  const [commentsLimit, setCommentsLimit] = useState(4);

  const {
    data,
    isFetching,
  } = useBookComments(slug, commentsLimit);
  const total = data?.total ?? initialTotal;

  const createComment = useCreateBookComment(slug);
  const updateComment = useUpdateBookComment(slug);
  const deleteComment = useDeleteBookComment(slug);
  const toggleLike = useToggleCommentLike(slug);

  // Комментарии из кэша (если уже подгружены) или initialData из страницы
  const comments = data?.items ?? initialItems;

  const currentUserId = user?.userId ?? null;
  const isAdminOrModerator = user?.role === "admin" || user?.role === "moderator";

  const canEdit = (c: BookCommentType) => c.user.id === currentUserId || isAdminOrModerator;
  const canDelete = (c: BookCommentType) => c.user.id === currentUserId || isAdminOrModerator;
  const canLike = (c: BookCommentType) => c.user.id !== currentUserId;

  const submitCreate = () => {
    const content = draft.trim();
    if (!content || createComment.isPending) return;
    createComment.mutate(
      { content },
      {
        onSuccess: () => {
          setDraft("");
          // Если показаны все — сдвигаем лимит на 1, чтобы новый комментарий
          // не вытеснил самый старый из списка (limit остаётся прежним total)
          setCommentsLimit((prev) => (prev > 4 ? prev + 1 : prev));
        },
      },
    );
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
                      <Icon name="person" className="text-[var(--bp-primary)] -rotate-45" />
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
                          <Icon
                            name="favorite"
                            className="text-sm"
                            style={{ fontVariationSettings: c.likesCount > 0 ? "'FILL' 1" : "'FILL' 0" }}
                          />
                          {c.likesCount > 0 ? c.likesCount : "Нравится"}
                        </button>
                      ) : (
                        <span className="flex items-center gap-2 text-[10px] text-white/30 bp-label-caps">
                          <Icon name="favorite" className="text-sm" />
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
                          <Icon name="edit" className="text-sm" />
                          Редактировать
                        </button>
                      )}

                      {canDelete(c) && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="flex items-center gap-1 text-[10px] text-white/40 hover:text-[var(--bp-error)] transition-colors bp-label-caps"
                        >
                          <Icon name="delete" className="text-sm" />
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {commentsLimit === 4 && total > 4 && (
              <button
                type="button"
                onClick={() => setCommentsLimit(total)}
                disabled={isFetching}
                className="self-center bp-label-caps text-[var(--bp-primary)] hover:text-white border border-primary/40 rounded-lg px-6 py-3 transition-colors disabled:opacity-50"
              >
                {isFetching ? "Загрузка..." : `Показать ещё (${total - 4})`}
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

      {/* Модалка подтверждения удаления (вместо window.confirm) */}
      {deleteTarget && (
        <DeleteCommentModal
          comment={deleteTarget}
          isPending={deleteComment.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteComment.mutate(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </section>
  );
}

/** Модалка «Удалить комментарий?» — подтверждение перед необратимым удалением. */
function DeleteCommentModal({
  comment,
  isPending,
  onCancel,
  onConfirm,
}: {
  comment: BookCommentType;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useBodyScrollLock(true);

  // Закрытие по Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Удаление комментария"
        className="w-full max-w-md bg-[var(--bp-surface-container-high)] border border-primary/30 rounded-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <Icon name="delete" className="text-2xl text-[var(--bp-error)] mt-0.5" />
          <div>
            <h3 className="bp-display text-white text-lg mb-1">Удалить комментарий?</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Комментарий будет удалён без возможности восстановления. Ответы на него
              (если есть) и лайки удалятся вместе с ним.
            </p>
          </div>
        </div>
        <div className="bp-glass-panel p-4 rounded-lg border border-white/10 mb-6">
          <p className="text-sm text-white/80 line-clamp-2">{comment.content}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="bp-label-caps text-white/60 hover:text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="bp-label-caps bg-[var(--bp-error)] hover:bg-red-600 text-[var(--bp-on-error)] px-5 py-2.5 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {isPending && <Icon name="progress_activity" className="text-sm animate-spin" />}
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
