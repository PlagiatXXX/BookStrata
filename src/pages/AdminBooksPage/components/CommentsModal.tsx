// src/pages/AdminBooksPage/components/CommentsModal.tsx
// Модерация комментариев к книгам (Фаза 7): просмотр, редактирование
// контента (до 2000 символов), удаление (каскадом на ответы).
import { useState } from "react";
import { X, Pencil, Trash2, Check } from "lucide-react";
import type { AdminComment } from "@/lib/adminBooksApi";

interface Props {
  book: { id: number; title: string };
  comments: AdminComment[];
  loading: boolean;
  onUpdate: (id: number, content: string) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export function CommentsModal({ book, comments, loading, onUpdate, onDelete, onClose }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const startEdit = (c: AdminComment) => {
    setEditingId(c.id);
    setDraft(c.content);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--ink-3)] bg-[var(--bg-1)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--ink-0)]">Комментарии к книге</h2>
            <p className="mt-1 text-sm text-[var(--ink-1)]">«{book.title}» — {comments.length} шт.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--ink-1)] hover:bg-[var(--ink-3)] hover:text-white cursor-pointer" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--ink-2)]">Загрузка…</p>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--ink-2)]">Комментариев нет</p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] p-3">
                {editingId === c.id ? (
                  <>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={2}
                      maxLength={2000}
                      className="w-full resize-y rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-2 py-1.5 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-[var(--ink-2)]">{draft.length}/2000</span>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)} className="rounded-lg px-2.5 py-1 text-xs text-[var(--ink-1)] hover:bg-[var(--ink-3)] cursor-pointer">
                          Отмена
                        </button>
                        <button
                          onClick={() => { onUpdate(c.id, draft); setEditingId(null); }}
                          disabled={!draft.trim()}
                          className="flex items-center gap-1 rounded-lg bg-[var(--accent-main)] px-2.5 py-1 text-xs font-medium text-[var(--bg-0)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                        >
                          <Check size={12} /> Сохранить
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-xs text-[var(--ink-2)]">
                        <span className="font-medium text-[var(--ink-0)]">{c.user.username}</span> ·{" "}
                        {new Date(c.createdAt).toLocaleString("ru-RU")}
                        {c.editedAt ? " · отредактирован" : ""}
                        {c.parentId ? " · ответ" : ""}
                      </p>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(c)} className="rounded p-1 text-[var(--ink-1)] hover:bg-[var(--ink-3)] hover:text-white cursor-pointer" aria-label="Редактировать">
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => { setDeletingId(c.id); }}
                          className="rounded p-1 text-red-400 hover:bg-red-500/10 cursor-pointer"
                          aria-label="Удалить"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-[var(--ink-0)]">{c.content}</p>
                    {deletingId === c.id && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                        <span className="flex-1 text-sm text-red-300">Удалить комментарий? Ответы удалятся вместе с ним.</span>
                        <button onClick={() => setDeletingId(null)} className="text-xs text-[var(--ink-1)] hover:text-white cursor-pointer">Отмена</button>
                        <button
                          onClick={() => { onDelete(c.id); setDeletingId(null); }}
                          className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
