// src/pages/AdminBooksPage/components/BookEditModal.tsx
// Редактор книги (Фаза 7): поля SEO-карточки, slug с историей, статус
// (publish через инвариант полноты), обогащение из Google Books, merge,
// редактор contextChain ({ icon, title, text }) с иконками Material Symbols.
import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, X } from "lucide-react";
import type { AdminBookDetail, BookUpdateInput, ContextChainItem } from "@/lib/adminBooksApi";

const MATERIAL_SYMBOLS = [
  "menu_book", "movie", "theaters", "music_note", "public", "school",
  "psychology", "lightbulb", "history_edu", "forum", "newspaper", "star",
  "flag", "rocket_launch", "castle", "science", "sports_esports", "palette",
  "code", "translate", "eco", "groups", "emoji_objects", "travel_explore",
];

interface Props {
  book: AdminBookDetail;
  saving: boolean;
  publishing: boolean;
  unpublishing: boolean;
  enriching: boolean;
  publishError: string | null;
  enrichResult: string[] | null;
  onSave: (patch: BookUpdateInput) => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onEnrich: () => void;
  onMerge: () => void;
  onClose: () => void;
}

export function BookEditModal({
  book, saving, publishing, unpublishing, enriching,
  publishError, enrichResult,
  onSave, onPublish, onUnpublish, onEnrich, onMerge, onClose,
}: Props) {
  const [form, setForm] = useState<BookUpdateInput>({});
  const [chain, setChain] = useState<ContextChainItem[]>(book.contextChain ?? []);

  const set = <K extends keyof BookUpdateInput>(key: K, value: BookUpdateInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setChainItem = (i: number, patch: Partial<ContextChainItem>) =>
    setChain((c) => c.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));

  const moveChain = (i: number, dir: -1 | 1) =>
    setChain((c) => {
      const j = i + dir;
      if (j < 0 || j >= c.length) return c;
      const next = [...c];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const isPublished = book.status === "published";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-[var(--ink-3)] bg-[var(--bg-1)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink-0)]">{book.title}</h2>
            <p className="mt-0.5 text-sm text-[var(--ink-1)]">
              #{book.id}
              {book.slug ? ` · /books/${book.slug}` : ""} ·{" "}
              <span className={isPublished ? "text-emerald-400" : "text-amber-400"}>
                {isPublished ? "опубликована" : "черновик"}
              </span>
            </p>
            {book.slugHistory.length > 0 && (
              <p className="mt-1 text-xs text-[var(--ink-2)]">
                История slug (301): {book.slugHistory.map((h) => h.oldSlug).join(", ")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--ink-1)] hover:bg-[var(--ink-3)] hover:text-white cursor-pointer" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--ink-1)]">Название *</span>
            <input
              value={form.title ?? book.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--ink-1)]">Автор *</span>
            <input
              value={form.author ?? book.author ?? ""}
              onChange={(e) => set("author", e.target.value)}
              className="w-full rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--ink-1)]">Slug</span>
            <input
              value={form.slug ?? book.slug ?? ""}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="латиница, цифры, дефисы"
              className="w-full rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--ink-1)]">Год издания *</span>
            <input
              type="number"
              value={form.publishedYear ?? book.publishedYear ?? ""}
              onChange={(e) => set("publishedYear", e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--ink-1)]">Жанр *</span>
            <input
              value={form.genre ?? book.genre ?? ""}
              onChange={(e) => set("genre", e.target.value)}
              className="w-full rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--ink-1)]">Теги (через запятую)</span>
            <input
              value={(form.tags ?? book.tags).join(", ")}
              onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
              className="w-full rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--ink-1)]">Обложка (URL)</span>
            <input
              value={form.coverImageUrl ?? book.coverImageUrl}
              onChange={(e) => set("coverImageUrl", e.target.value)}
              className="w-full rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm text-[var(--ink-1)]">Описание *</span>
            <textarea
              rows={3}
              value={form.description ?? book.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              className="w-full resize-y rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
            />
          </label>
        </div>

        {/* Погружение в контекст */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ink-0)]">
              «Погружение в контекст» (contextChain)
            </h3>
            <button
              onClick={() => setChain((c) => [...c, { icon: "menu_book", title: "", text: "" }])}
              className="flex items-center gap-1 rounded-lg bg-[var(--accent-main)] px-2.5 py-1.5 text-xs font-medium text-[var(--bg-0)] hover:opacity-90 cursor-pointer"
            >
              <Plus size={14} /> Добавить
            </button>
          </div>
          {chain.length === 0 && (
            <p className="text-xs text-[var(--ink-2)]">Пусто — блок не отображается на странице книги.</p>
          )}
          <div className="space-y-2">
            {chain.map((item, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] p-2.5">
                <select
                  value={item.icon}
                  onChange={(e) => setChainItem(i, { icon: e.target.value })}
                  className="rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-2 py-1.5 text-sm text-[var(--ink-0)] outline-none"
                >
                  {MATERIAL_SYMBOLS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <input
                  value={item.title}
                  onChange={(e) => setChainItem(i, { title: e.target.value })}
                  placeholder="Заголовок"
                  className="w-1/3 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-2 py-1.5 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
                />
                <input
                  value={item.text}
                  onChange={(e) => setChainItem(i, { text: e.target.value })}
                  placeholder="Текст"
                  className="flex-1 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-0)] px-2 py-1.5 text-sm text-[var(--ink-0)] outline-none focus:border-[var(--accent-main)]"
                />
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveChain(i, -1)} disabled={i === 0} className="rounded p-1 text-[var(--ink-1)] hover:bg-[var(--ink-3)] hover:text-white disabled:opacity-30 cursor-pointer" aria-label="Вверх">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => moveChain(i, 1)} disabled={i === chain.length - 1} className="rounded p-1 text-[var(--ink-1)] hover:bg-[var(--ink-3)] hover:text-white disabled:opacity-30 cursor-pointer" aria-label="Вниз">
                    <ArrowDown size={14} />
                  </button>
                </div>
                <button onClick={() => setChain((c) => c.filter((_, idx) => idx !== i))} className="rounded p-1 text-red-400 hover:bg-red-500/10 cursor-pointer" aria-label="Удалить">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {publishError && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{publishError}</p>
        )}
        {enrichResult && (
          <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            Обогащено из Google Books: {enrichResult.length > 0 ? enrichResult.join(", ") : "изменений нет"}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--ink-3)] pt-4">
          <button
            onClick={() => onSave({ ...form, contextChain: chain })}
            disabled={saving}
            className="rounded-lg bg-[var(--accent-main)] px-4 py-2 text-sm font-semibold text-[var(--bg-0)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          {isPublished ? (
            <button
              onClick={onUnpublish}
              disabled={unpublishing}
              className="rounded-lg border border-amber-500/40 px-4 py-2 text-sm text-amber-300 hover:bg-amber-500/10 disabled:opacity-50 cursor-pointer"
            >
              {unpublishing ? "…" : "Вернуть в черновик"}
            </button>
          ) : (
            <button
              onClick={onPublish}
              disabled={publishing}
              className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 cursor-pointer"
            >
              {publishing ? "…" : "Опубликовать"}
            </button>
          )}
          <button
            onClick={onEnrich}
            disabled={enriching}
            className="rounded-lg border border-[var(--ink-3)] px-4 py-2 text-sm text-[var(--ink-0)] hover:bg-[var(--ink-3)] disabled:opacity-50 cursor-pointer"
          >
            {enriching ? "Обогащение…" : "Обогатить из Google Books"}
          </button>
          <button
            onClick={onMerge}
            className="ml-auto rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 cursor-pointer"
          >
            Склеить с дублем…
          </button>
        </div>
      </div>
    </div>
  );
}
