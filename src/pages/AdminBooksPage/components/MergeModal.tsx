// src/pages/AdminBooksPage/components/MergeModal.tsx
// Ручной merge дубля в канон (Фаза 7): поиск книги-кандидата и склейка
// через mergedIntoId (перенос связей + история для аудита).
import { useState } from "react";
import { X, Search } from "lucide-react";
import type { AdminBookListItem } from "@/lib/adminBooksApi";

interface Props {
  book: { id: number; title: string };
  searching: boolean;
  candidates: AdminBookListItem[];
  merging: boolean;
  onSearch: (q: string) => void;
  onMerge: (targetId: number) => void;
  onClose: () => void;
}

export function MergeModal({ book, searching, candidates, merging, onSearch, onMerge, onClose }: Props) {
  const [q, setQ] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-[var(--ink-3)] bg-[var(--bg-1)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--ink-0)]">Склейка дубля</h2>
            <p className="mt-1 text-sm text-[var(--ink-1)]">
              Поглощаемая книга: <span className="font-medium text-[var(--ink-0)]">«{book.title}» (#{book.id})</span>.
              Связи (рейтинги, тир-листы, коллекции) перенесутся в канон, дубль получит метку mergedIntoId.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--ink-1)] hover:bg-[var(--ink-3)] hover:text-white cursor-pointer" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-3 py-2">
          <Search size={16} className="shrink-0 text-[var(--ink-2)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch(q)}
            placeholder="Название книги-канона… (Enter)"
            className="flex-1 bg-transparent text-sm text-[var(--ink-0)] outline-none placeholder:text-[var(--ink-2)]"
          />
          <button
            onClick={() => onSearch(q)}
            disabled={searching || !q.trim()}
            className="rounded-lg bg-[var(--accent-main)] px-3 py-1 text-xs font-medium text-[var(--bg-0)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {searching ? "…" : "Найти"}
          </button>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {candidates.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] p-3">
              <img
                src={c.coverImageUrl || undefined}
                alt=""
                className="h-12 w-8 shrink-0 rounded object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--ink-0)]">{c.title}</p>
                <p className="truncate text-xs text-[var(--ink-2)]">
                  {c.author ?? "—"} · {c.status === "published" ? "опубликована" : "черновик"} · #{c.id}
                </p>
              </div>
              <button
                onClick={() => onMerge(c.id)}
                disabled={merging}
                className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"
              >
                {merging ? "…" : "Склеить"}
              </button>
            </div>
          ))}
          {!searching && candidates.length === 0 && q && (
            <p className="text-center text-sm text-[var(--ink-2)]">Ничего не найдено</p>
          )}
        </div>
      </div>
    </div>
  );
}
