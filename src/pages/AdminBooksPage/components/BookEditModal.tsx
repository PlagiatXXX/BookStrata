// src/pages/AdminBooksPage/components/BookEditModal.tsx
// Редактор книги (Фаза 7): поля SEO-карточки, slug с историей, статус
// (publish через инвариант полноты), обогащение из Google Books, merge,
// редактор contextChain ({ icon, title, text }) с иконками Material Symbols.
import { useRef, useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, X, Upload } from "lucide-react";
import type { AdminBookDetail, BookUpdateInput, ContextChainItem } from "@/lib/adminBooksApi";
import { uploadBookCover } from "@/lib/adminBooksApi";

const MATERIAL_SYMBOLS = [
  "menu_book", "movie", "public", "psychology", "lightbulb", "history_edu",
  "forum", "newspaper", "star", "flag", "code", "translate", "groups",
  "emoji_objects", "fact_check", "format_quote",
];

// Русские названия иконок для выбора в админке
const ICON_LABELS: Record<string, string> = {
  menu_book: "Книга",
  movie: "Фильм",
  public: "Мир",
  psychology: "Психология",
  lightbulb: "Идея",
  history_edu: "История",
  forum: "Обсуждение",
  newspaper: "Пресса",
  star: "Звезда",
  flag: "Достижение",
  code: "Технологии",
  translate: "Перевод",
  groups: "Сообщество",
  emoji_objects: "Заметка",
  fact_check: "Факт",
  format_quote: "Цитата",
};

interface Props {
  book: AdminBookDetail;
  saving: boolean;
  publishing: boolean;
  unpublishing: boolean;
  enriching: boolean;
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
  enrichResult,
  onSave, onPublish, onUnpublish, onEnrich, onMerge, onClose,
}: Props) {
  const [form, setForm] = useState<BookUpdateInput>({});
  const [chain, setChain] = useState<ContextChainItem[]>(book.contextChain ?? []);
  // Сырая строка тегов: парсится в массив только при сохранении, иначе
  // запятая мгновенно отфильтровывается как пустой тег и не вводится
  const [tagsInput, setTagsInput] = useState((book.tags ?? []).join(", "));
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;
    setCoverUploading(true);
    setCoverError(null);
    try {
      const { coverImageUrl } = await uploadBookCover(file);
      set("coverImageUrl", coverImageUrl);
    } catch {
      setCoverError("Не удалось загрузить обложку");
    } finally {
      setCoverUploading(false);
    }
  };

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
        className="w-full max-w-3xl rounded-2xl border border-(--ink-3) bg-(--bg-1) p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-(--ink-0)">{book.title}</h2>
            <p className="mt-0.5 text-sm text-(--ink-1)">
              #{book.id}
              {book.slug ? ` · /books/${book.slug}` : ""} ·{" "}
              <span className={isPublished ? "text-emerald-400" : "text-amber-400"}>
                {isPublished ? "опубликована" : "черновик"}
              </span>
            </p>
            {book.slugHistory.length > 0 && (
              <p className="mt-1 text-xs text-(--ink-2)">
                История slug (301): {book.slugHistory.map((h) => h.oldSlug).join(", ")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-(--ink-1) hover:bg-(--ink-3) hover:text-white cursor-pointer" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">Название *</span>
            <input
              value={form.title ?? book.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">Автор *</span>
            <input
              value={form.author ?? book.author ?? ""}
              onChange={(e) => set("author", e.target.value)}
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">Slug</span>
            <input
              value={form.slug ?? book.slug ?? ""}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="латиница, цифры, дефисы"
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">Год издания *</span>
            <input
              type="number"
              value={form.publishedYear ?? book.publishedYear ?? ""}
              onChange={(e) => set("publishedYear", e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">Жанр *</span>
            <input
              value={form.genre ?? book.genre ?? ""}
              onChange={(e) => set("genre", e.target.value)}
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">Теги (через запятую)</span>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">Обложка (URL)</span>
            <div className="flex gap-2">
              <input
                value={form.coverImageUrl ?? book.coverImageUrl}
                onChange={(e) => set("coverImageUrl", e.target.value)}
                placeholder="/images/books/... или http(s)://"
                className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleCoverUpload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={coverUploading}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-(--ink-3) px-3 py-2 text-sm text-(--ink-0) hover:bg-(--ink-3) disabled:opacity-50 cursor-pointer"
              >
                <Upload size={14} />
                {coverUploading ? "Загрузка…" : "Загрузить"}
              </button>
            </div>
            {coverError && (
              <p className="mt-1 text-xs text-red-400">{coverError}</p>
            )}
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm text-(--ink-1)">Описание *</span>
            <textarea
              rows={3}
              value={form.description ?? book.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              className="w-full resize-y rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
        </div>

        {/* Погружение в контекст */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-(--ink-0)">
              «Погружение в контекст» (contextChain)
            </h3>
            <button
              onClick={() => setChain((c) => [...c, { icon: "menu_book", title: "", text: "" }])}
              className="flex items-center gap-1 rounded-lg bg-(--accent-main) px-2.5 py-1.5 text-xs font-medium text-(--bg-0) hover:opacity-90 cursor-pointer"
            >
              <Plus size={14} /> Добавить
            </button>
          </div>
          {chain.length === 0 && (
            <p className="text-xs text-(--ink-2)">Пусто — блок не отображается на странице книги.</p>
          )}
          <div className="space-y-2">
            {chain.map((item, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-(--ink-3) bg-(--bg-0) p-2.5">
                <select
                  value={item.icon}
                  onChange={(e) => setChainItem(i, { icon: e.target.value })}
                  className="rounded-lg border border-(--ink-3) bg-(--bg-0) px-2 py-1.5 text-sm text-(--ink-0) outline-none"
                >
                  {[...new Set([...MATERIAL_SYMBOLS, ...chain.map((c) => c.icon)])].map((icon) => (
                    <option key={icon} value={icon}>
                      {ICON_LABELS[icon] ?? icon} ({icon})
                    </option>
                  ))}
                </select>
                <input
                  value={item.title}
                  onChange={(e) => setChainItem(i, { title: e.target.value })}
                  placeholder="Заголовок"
                  className="w-1/3 rounded-lg border border-(--ink-3) bg-(--bg-0) px-2 py-1.5 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
                />
                <input
                  value={item.text}
                  onChange={(e) => setChainItem(i, { text: e.target.value })}
                  placeholder="Текст"
                  className="flex-1 rounded-lg border border-(--ink-3) bg-(--bg-0) px-2 py-1.5 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
                />
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveChain(i, -1)} disabled={i === 0} className="rounded p-1 text-(--ink-1) hover:bg-(--ink-3) hover:text-white disabled:opacity-30 cursor-pointer" aria-label="Вверх">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => moveChain(i, 1)} disabled={i === chain.length - 1} className="rounded p-1 text-(--ink-1) hover:bg-(--ink-3) hover:text-white disabled:opacity-30 cursor-pointer" aria-label="Вниз">
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

        {enrichResult && (
          <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            Обогащено из Google Books: {enrichResult.length > 0 ? enrichResult.join(", ") : "изменений нет"}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-(--ink-3) pt-4">
          <button
            onClick={() =>
              onSave({
                ...form,
                tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
                contextChain: chain,
              })
            }
            disabled={saving}
            className="rounded-lg bg-(--accent-main) px-4 py-2 text-sm font-semibold text-(--bg-0) hover:opacity-90 disabled:opacity-50 cursor-pointer"
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
            className="rounded-lg border border-(--ink-3) px-4 py-2 text-sm text-(--ink-0) hover:bg-(--ink-3) disabled:opacity-50 cursor-pointer"
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
