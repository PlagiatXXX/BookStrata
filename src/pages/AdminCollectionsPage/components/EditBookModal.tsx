import { useEffect, useRef, useState } from "react";
import { X, Search } from "lucide-react";
import type { CuratedBook } from "./types";
import { RetryableImage } from "@/ui/RetryableImage";
import {
  matchCatalogBookLookup,
  type CatalogBookMatch,
} from "@/lib/collectionsApi";

interface EditBookModalProps {
  editForm: CuratedBook;
  onFieldChange: (form: CuratedBook) => void;
  onSave: () => void;
  onClose: () => void;
}

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; book: CatalogBookMatch }
  | { status: "candidates"; candidates: CatalogBookMatch[] }
  | { status: "notfound" };

/**
 * Автопоиск книги в каталоге по названию+автору (debounce 500мс).
 * При точном совпадении — автозаполняет пустые поля карточки,
 * чтобы не плодить дубли: синк при сохранении прилинкует канон.
 */
export function EditBookModal({ editForm, onFieldChange, onSave, onClose }: EditBookModalProps) {
  const set = (field: keyof CuratedBook, value: unknown) => {
    onFieldChange({ ...editForm, [field]: value });
  };

  const [lookupResult, setLookupResult] = useState<{ key: string; state: LookupState } | null>(null);

  const title = editForm.title.trim();
  const author = editForm.author.trim();

  // Актуальная форма для асинхронных колбэков поиска (обновляется после каждого рендера)
  const editFormRef = useRef(editForm);
  useEffect(() => {
    editFormRef.current = editForm;
  });

  // Ключ текущего запроса (вычисляется в рендере — не состояние)
  const searchKey = title.length >= 3 ? `${title.toLowerCase()}::${author.toLowerCase()}` : "";

  // Статус поиска — производное: пока результат не пришёл для текущего ключа — loading
  const lookup: LookupState = (() => {
    if (!searchKey) return { status: "idle" };
    if (lookupResult && lookupResult.key === searchKey) return lookupResult.state;
    return { status: "loading" };
  })();

  // Автопоиск: пауза 500мс после ввода названия (автор опционален)
  useEffect(() => {
    if (!searchKey) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await matchCatalogBookLookup(title, author);
        if (cancelled) return; // запрос устарел
        let state: LookupState;
        if (res.book) {
          state = { status: "found", book: res.book };
          // Автозаполнение пустых полей карточки данными каталога.
          // title/author не перезаписываем: они и есть ключ матчинга синка.
          const form = editFormRef.current;
          onFieldChange({
            ...form,
            coverImageUrl: form.coverImageUrl || res.book.coverImageUrl,
            year: form.year ?? res.book.publishedYear ?? undefined,
            genre: form.genre || res.book.genre || "",
            tags: form.tags || (res.book.tags.length > 0 ? res.book.tags.join(", ") : ""),
            description: form.description || res.book.description || "",
          });
        } else if (res.candidates.length > 0) {
          state = { status: "candidates", candidates: res.candidates };
        } else {
          state = { status: "notfound" };
        }
        setLookupResult({ key: searchKey, state });
      } catch {
        // Сетевая ошибка: показываем как «не найдена», не мешаем редактированию
        if (!cancelled) setLookupResult({ key: searchKey, state: { status: "notfound" } });
      }
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [title, author, searchKey, onFieldChange]);

  /** Принудительное заполнение карточки данными каталога (кнопка/выбор кандидата) */
  const applyCatalogBook = (b: CatalogBookMatch) => {
    onFieldChange({
      ...editForm,
      title: b.title,
      author: b.author ?? "",
      coverImageUrl: b.coverImageUrl,
      year: b.publishedYear ?? undefined,
      genre: b.genre ?? "",
      tags: b.tags.join(", "),
      description: b.description ?? "",
    });
    setLookupResult({ key: searchKey, state: { status: "found", book: b } });
  };

  return (
    <div className="admin-collections-modal-overlay">
      <div
        className="admin-collections-modal curated-edit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-collections-modal-header">
          <h2>Редактировать книгу</h2>
          <button className="admin-collections-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="admin-collections-form">
          {/* Автопоиск в каталоге */}
          {lookup.status === "loading" && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-2)] px-3 py-2 text-xs text-[var(--ink-1)]">
              <Search size={14} className="animate-pulse" />
              Ищем в каталоге…
            </div>
          )}
          {lookup.status === "found" && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <img
                src={lookup.book.coverImageUrl || undefined}
                alt=""
                className="h-10 w-7 shrink-0 rounded object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-emerald-300">
                  Книга уже в каталоге
                </p>
                <p className="truncate text-xs text-[var(--ink-1)]">
                  {lookup.book.title} — {lookup.book.author ?? ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyCatalogBook(lookup.book)}
                className="shrink-0 cursor-pointer rounded-lg border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/15"
              >
                Заполнить из каталога
              </button>
            </div>
          )}
          {lookup.status === "candidates" && (
            <div className="mb-3 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-2)] px-3 py-2">
              <p className="mb-1.5 text-xs text-[var(--ink-1)]">
                Похожие книги в каталоге — выберите, если это она:
              </p>
              <div className="flex flex-col gap-1">
                {lookup.candidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => applyCatalogBook(c)}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-[var(--ink-0)] hover:bg-[var(--ink-3)]/50"
                  >
                    <img
                      src={c.coverImageUrl || undefined}
                      alt=""
                      className="h-8 w-6 shrink-0 rounded object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="truncate">
                      {c.title} — {c.author ?? ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {lookup.status === "notfound" && (
            <div className="mb-3 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-2)] px-3 py-2 text-xs text-[var(--ink-2)]">
              В каталоге не найдена — при сохранении будет создана новая запись
            </div>
          )}

          <div className="admin-collections-form-row">
            <div className="admin-collections-form-group">
              <label>Автор</label>
              <input
                type="text"
                value={editForm.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="Имя автора"
              />
            </div>
            <div className="admin-collections-form-group">
              <label>Название *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Название книги"
              />
            </div>
          </div>

          <div className="admin-collections-form-row">
            <div className="admin-collections-form-group">
              <label>Жанр</label>
              <input
                type="text"
                value={editForm.genre || ""}
                onChange={(e) => set("genre", e.target.value)}
                placeholder="Фэнтези, детектив..."
              />
            </div>
            <div className="admin-collections-form-group">
              <label>Теги (через запятую)</label>
              <input
                type="text"
                value={editForm.tags || ""}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="магия, приключения, эпос"
              />
            </div>
          </div>

          <div className="admin-collections-form-group">
            <label>URL обложки</label>
            <input
              type="text"
              value={editForm.coverImageUrl}
              onChange={(e) => set("coverImageUrl", e.target.value)}
              placeholder="/images/collections/curated/slug/image.jpeg"
            />
            {editForm.coverImageUrl && (
              <div className="curated-edit-cover-preview">
                <RetryableImage
                  src={editForm.coverImageUrl}
                  alt=""
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img) img.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          <div className="admin-collections-form-group">
            <label>Описание</label>
            <textarea
              value={editForm.description || ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Краткое описание книги"
              rows={3}
            />
          </div>

          <div className="admin-collections-form-group">
              <label>Год издания</label>
              <input
                type="number"
                min={1000}
                max={2100}
                value={editForm.year ?? ""}
                onChange={(e) =>
                  set("year", e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                placeholder="1925"
              />
              <span className="admin-collections-form-hint">
                Обязателен для публикации книги в каталоге (Google Books: publishedDate)
              </span>
            </div>

          <div className="admin-collections-form-group">
            <label>Средняя оценка (1–10)</label>
            <input
              type="number"
              min={1}
              max={10}
              step={0.1}
              value={editForm.rating ?? ""}
              onChange={(e) =>
                set("rating", e.target.value ? parseFloat(e.target.value) : undefined)
              }
              placeholder="8.5"
            />
          </div>

          <div className="admin-collections-form-actions">
            <button type="button" className="admin-collections-btn-cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="button" className="admin-collections-btn-submit" onClick={onSave}>
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
