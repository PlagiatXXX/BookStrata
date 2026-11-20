// src/pages/BookPage/BookComments.tsx
// «Обсуждение» — комментарии книги в стиле арт-деко (геометрические рамки,
// ромбовидные аватары — по reference/code.html). Список с пагинацией
// (useInfiniteQuery), форма добавления, редактирование/удаление своих,
// лайки чужих. Матрица прав — по плану (Фаза 5).
import { useEffect, useRef, useState } from "react";
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
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyFocusKey, setReplyFocusKey] = useState(0);
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // При открытии формы ответа устанавливаем курсор строго в конец текста (после @ник, )
  useEffect(() => {
    if (replyToId) {
      const timer = requestAnimationFrame(() => {
        if (replyTextareaRef.current) {
          const el = replyTextareaRef.current;
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [replyToId, replyFocusKey]);
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

  const canEdit = (c: BookCommentType) => !c.isDeleted && (c.user.id === currentUserId || isAdminOrModerator);
  const canDelete = (c: BookCommentType) => !c.isDeleted && (c.user.id === currentUserId || isAdminOrModerator);
  const canLike = (c: BookCommentType) => !c.isDeleted && c.user.id !== currentUserId;

  const submitCreate = (parentId?: number, customContent?: string) => {
    const content = (customContent ?? draft).trim();
    if (!content || createComment.isPending) return;
    createComment.mutate(
      { content, parentId },
      {
        onSuccess: () => {
          if (parentId) {
            setReplyToId(null);
            setReplyDraft("");
          } else {
            setDraft("");
          }
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

  // Разделение на корневые комментарии и ответы
  const rootComments = comments.filter((c) => !c.parentId);
  const repliesByParentId = comments.reduce<Record<number, BookCommentType[]>>((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  const renderCommentCard = (c: BookCommentType, isReply = false) => (
    <article
      key={c.id}
      className={`bp-glass-panel ${isReply ? "p-3 sm:p-4 bg-black/20" : "p-4 sm:p-6"} rounded-none border border-primary/20 shadow-lg relative overflow-hidden`}
    >
      {/* Геометрические уголки (арт-деко) для основных комментариев */}
      {!isReply && (
        <>
          <div aria-hidden className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/50" />
          <div aria-hidden className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary/50" />
        </>
      )}

      <div className="flex gap-3 sm:gap-4 items-start">
        {/* Кликабельный ромбовидный аватар со ссылкой на профиль */}
        {c.isDeleted ? (
          <div className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center shrink-0 mt-1 opacity-40">
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-black/50 border border-primary/20 flex items-center justify-center overflow-hidden rotate-45 transform-gpu">
              <Icon name="person" className="text-white/40 text-xs sm:text-sm -rotate-45" />
            </div>
          </div>
        ) : (
          <Link
            to={`/users/${c.user.id}`}
            className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center shrink-0 mt-1 group"
            aria-label={`Профиль ${c.user.username}`}
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-black/50 border border-primary/40 group-hover:border-primary flex items-center justify-center overflow-hidden rotate-45 transform-gpu transition-colors">
              {c.user.avatarUrl ? (
                <img
                  src={c.user.avatarUrl}
                  alt={c.user?.username || "Аватар"}
                  className="w-full h-full object-cover -rotate-45 scale-125"
                />
              ) : (
                <Icon name="person" className="text-[var(--bp-primary)] text-xs sm:text-sm -rotate-45" />
              )}
            </div>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 mb-2">
            {c.isDeleted ? (
              <span className="bp-label-caps text-white/40 tracking-widest uppercase text-xs sm:text-sm font-medium">
                Пользователь
              </span>
            ) : (
              <Link
                to={`/users/${c.user.id}`}
                className="bp-label-caps text-white hover:text-[var(--bp-primary)] transition-colors tracking-widest uppercase truncate max-w-[170px] sm:max-w-none text-xs sm:text-sm font-medium"
              >
                {c.user.username}
              </Link>
            )}
            <span className="text-[10px] text-primary/60 tracking-widest uppercase shrink-0">
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
                className="w-full min-w-0 bg-black/40 border border-primary/30 rounded-lg p-3 text-sm text-white/90 outline-none focus:border-primary transition-colors resize-y"
              />
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => submitEdit(c)}
                  disabled={updateComment.isPending}
                  className="bp-label-caps bg-[var(--bp-primary)] hover:bg-[var(--bp-primary-container)] text-[var(--bp-on-primary)] px-3 sm:px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-xs sm:text-sm"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="bp-label-caps text-white/60 hover:text-white px-3 sm:px-4 py-2 transition-colors text-xs sm:text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <p className={`${c.isDeleted ? "text-white/40 italic" : "text-white/80"} leading-relaxed mb-4 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}>
              {c.content}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 pt-1 border-t border-white/5">
            {!c.isDeleted && canLike(c) && (
              <button
                type="button"
                onClick={() => toggleLike.mutate(c.id)}
                className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-[var(--bp-primary)] transition-colors bp-label-caps shrink-0"
              >
                <Icon
                  name="favorite"
                  className="text-sm"
                  style={{ fontVariationSettings: c.likesCount > 0 ? "'FILL' 1" : "'FILL' 0" }}
                />
                {c.likesCount > 0 ? c.likesCount : "Нравится"}
              </button>
            )}

            {!c.isDeleted && !canLike(c) && (
              <span className="flex items-center gap-1.5 text-[10px] text-white/30 bp-label-caps shrink-0">
                <Icon name="favorite" className="text-sm" />
                {c.likesCount > 0 ? c.likesCount : "Нравится"}
              </span>
            )}

            {/* Кнопка «Ответить» доступна авторизованным пользователям для любых комментариев ветки */}
            {user && (
              <button
                type="button"
                onClick={() => {
                  const targetParentId = isReply ? (c.parentId ?? c.id) : c.id;
                  const newDraft = c.isDeleted ? "" : `@${c.user.username}, `;
                  if (replyToId === targetParentId && replyDraft === newDraft) {
                    setReplyToId(null);
                    setReplyDraft("");
                  } else {
                    setReplyToId(targetParentId);
                    setReplyDraft(newDraft);
                    setReplyFocusKey((k) => k + 1);
                  }
                }}
                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-[var(--bp-primary)] transition-colors bp-label-caps shrink-0"
              >
                <Icon name="reply" className="text-sm" />
                Ответить
              </button>
            )}

            {canEdit(c) && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(c.id);
                  setEditDraft(c.content);
                }}
                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition-colors bp-label-caps shrink-0"
              >
                <Icon name="edit" className="text-sm" />
                Редактировать
              </button>
            )}

            {canDelete(c) && (
              <button
                type="button"
                onClick={() => setDeleteTarget(c)}
                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-[var(--bp-error)] transition-colors bp-label-caps shrink-0"
              >
                <Icon name="delete" className="text-sm" />
                Удалить
              </button>
            )}
          </div>

          {/* Форма ответа под комментарием */}
          {replyToId === c.id && (
            <div className="mt-3 pt-3 border-t border-primary/20 bg-black/20 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[var(--bp-primary)] font-medium">
                  {replyDraft.startsWith("@")
                    ? `Ответ для ${replyDraft.split(",")[0]}`
                    : c.isDeleted
                      ? "Ответ в ветку"
                      : `Ответ для @${c.user.username}`}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyToId(null)}
                  className="text-white/40 hover:text-white text-xs"
                  aria-label="Закрыть форму ответа"
                >
                  <Icon name="close" className="text-sm" />
                </button>
              </div>
              <textarea
                ref={replyTextareaRef}
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Напишите ответ..."
                maxLength={2000}
                rows={2}
                className="w-full min-w-0 bg-black/40 border border-primary/30 rounded-lg p-2.5 text-sm text-white/90 placeholder-white/30 outline-none focus:border-primary transition-colors resize-y"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setReplyToId(null)}
                  className="bp-label-caps text-white/60 hover:text-white px-3 py-1.5 transition-colors text-xs"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => submitCreate(c.id, replyDraft)}
                  disabled={!replyDraft.trim() || createComment.isPending}
                  className="bp-label-caps bg-[var(--bp-primary)] hover:bg-[var(--bp-primary-container)] text-[var(--bp-on-primary)] px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40 text-xs"
                >
                  {createComment.isPending ? "Отправка..." : "Отправить ответ"}
                </button>
              </div>
            </div>
          )}

          {/* Вложенные ответы ветки */}
          {repliesByParentId[c.id]?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5 pl-3 sm:pl-5 border-l-2 border-primary/30 space-y-3">
              {repliesByParentId[c.id].map((reply) => renderCommentCard(reply, true))}
            </div>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <section className="relative py-10 md:py-16 bg-[var(--bp-background)] border-t border-primary/20">
      <div className="max-w-[1100px] mx-auto px-4 md:px-5">
        <div className="flex items-center justify-between mb-6 md:mb-8 border-b border-primary/20 pb-4">
          <h2 className="bp-display text-white tracking-widest uppercase text-xl md:text-2xl">
            Обсуждение <span className="text-[var(--bp-primary)] text-base ml-2">{total}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          <div className="md:col-span-8 flex flex-col gap-4 sm:gap-6 min-w-0">
            {rootComments.length === 0 && (
              <p className="text-white/50 text-sm leading-relaxed">
                Пока нет обсуждений. Будьте первым, кто поделится впечатлением о книге.
              </p>
            )}

            {rootComments.map((c) => renderCommentCard(c, false))}

            {commentsLimit === 4 && total > 4 && (
              <button
                type="button"
                onClick={() => setCommentsLimit(total)}
                disabled={isFetching}
                className="self-center bp-label-caps text-[var(--bp-primary)] hover:text-white border border-primary/40 rounded-lg px-6 py-3 transition-colors disabled:opacity-50 text-xs sm:text-sm"
              >
                {isFetching ? "Загрузка..." : `Показать ещё (${total - 4})`}
              </button>
            )}
          </div>

          {/* Форма добавления — в правой колонке на десктопе, снизу под комментариями на мобильном */}
          <div className="md:col-span-4 min-w-0">
            <div className="bp-glass-panel p-4 sm:p-6 border border-primary/20 shadow-lg static md:sticky md:top-24">
              <h3 className="bp-label-caps text-[var(--bp-primary)] tracking-widest uppercase mb-3 sm:mb-4 text-xs sm:text-sm">
                Ваше мнение
              </h3>
              {user ? (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Поделитесь впечатлением о книге..."
                    maxLength={2000}
                    rows={4}
                    className="w-full min-w-0 bg-black/40 border border-primary/30 rounded-lg p-3 text-sm text-white/90 placeholder-white/30 outline-none focus:border-primary transition-colors resize-y"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-white/30">{draft.length}/2000</span>
                    <button
                      type="button"
                      onClick={() => submitCreate()}
                      disabled={!draft.trim() || createComment.isPending}
                      className="bp-label-caps bg-[var(--bp-primary)] hover:bg-[var(--bp-primary-container)] text-[var(--bp-on-primary)] px-4 sm:px-5 py-2.5 rounded-lg transition-colors disabled:opacity-40 text-xs sm:text-sm"
                    >
                      {createComment.isPending ? "Отправка..." : "Отправить"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/70 leading-relaxed">
                  <Link to="/auth" className="text-[var(--bp-primary)] underline hover:no-underline hover:text-white transition-colors">
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
              Комментарий будет удалён. Если на него уже ответили другие пользователи, вместо текста отобразится «Комментарий удалён», чтобы не нарушать ветку обсуждения.
            </p>
          </div>
        </div>
        <div className="bp-glass-panel p-3 sm:p-4 rounded-lg border border-white/10 mb-6 overflow-hidden">
          <p className="text-sm text-white/80 line-clamp-2 break-words [overflow-wrap:anywhere]">{comment.content}</p>
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
