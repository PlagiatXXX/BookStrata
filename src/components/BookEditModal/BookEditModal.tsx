import { useReducer, useEffect, useState, useCallback, useRef } from "react";
import { X, Star, Hash, Sparkles, Loader } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import type { Book } from "@/types";
import { createLogger } from "@/lib/logger";
import { EditorConfirmModal } from "@/components/EditorModals/EditorConfirmModal";
import {
  RATING_CATEGORIES,
  rateBook,
  getBookRatings,
  getUserBookRating,
} from "@/lib/ratingsApi";
import { proxyImageUrl } from "@/utils/imageProxy";
import type { BookRatingsResult } from "@/lib/ratingsApi";
import { RetryableImage } from "@/ui/RetryableImage";
import { useAuth } from "@/hooks/useAuthContext";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder/BookCoverPlaceholder";
import { uploadBookCover } from "@/lib/tierListApi";
import { generateBookDescription } from "@/lib/aiLibrarianApi";
import { sileo } from "sileo";
import AuthorInput from "@/components/AuthorInput/AuthorInput";

const logger = createLogger("BookEditModal", { color: "cyan" });

interface BookEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  tierListId?: string;
  onSave: (
    bookId: string,
    data: {
      title?: string;
      author?: string;
      description?: string;
      thoughts?: string;
      coverImageUrl?: string;
      genre?: string;
      tags?: string[];
    },
  ) => void;
}

interface BookFormState {
  title: string;
  author: string;
  genre: string;
  tagsInput: string;
  description: string;
  thoughts: string;
  coverImageUrl: string;
}

type BookFormAction =
  | { type: "SET_BOOK"; book: Book }
  | { type: "RESET" }
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_AUTHOR"; author: string }
  | { type: "SET_GENRE"; genre: string }
  | { type: "SET_TAGS_INPUT"; tagsInput: string }
  | { type: "SET_DESCRIPTION"; description: string }
  | { type: "SET_THOUGHTS"; thoughts: string }
  | { type: "SET_COVER_IMAGE_URL"; coverImageUrl: string };

/** Парсит строку с тегами (#тег1 #тег2) в массив */
function parseTags(input: string): string[] {
  const words = input.split(/\s+/).filter(Boolean);
  const tags: string[] = [];
  for (const w of words) {
    const cleaned = w.startsWith("#") ? w.slice(1) : w;
    if (cleaned) tags.push(cleaned);
  }
  return tags;
}

/** Форматирует массив тегов в строку для инпута */
function formatTags(tags?: string[]): string {
  if (!tags || tags.length === 0) return "";
  return tags.map((t) => `#${t}`).join(" ");
}

function bookFormReducer(
  state: BookFormState,
  action: BookFormAction,
): BookFormState {
  switch (action.type) {
    case "SET_BOOK":
      return {
        title: action.book.title,
        author: action.book.author || "",
        genre: action.book.genre || "",
        tagsInput: formatTags(action.book.tags),
        description: action.book.description || "",
        thoughts: action.book.thoughts || "",
        coverImageUrl: action.book.coverImageUrl || "",
      };
    case "RESET":
      return {
        title: "",
        author: "",
        genre: "",
        tagsInput: "",
        description: "",
        thoughts: "",
        coverImageUrl: "",
      };
    case "SET_TITLE":
      return { ...state, title: action.title };
    case "SET_AUTHOR":
      return { ...state, author: action.author };
    case "SET_GENRE":
      return { ...state, genre: action.genre };
    case "SET_TAGS_INPUT":
      return { ...state, tagsInput: action.tagsInput };
    case "SET_DESCRIPTION":
      return { ...state, description: action.description };
    case "SET_THOUGHTS":
      return { ...state, thoughts: action.thoughts };
    case "SET_COVER_IMAGE_URL":
      return { ...state, coverImageUrl: action.coverImageUrl };
    default:
      return state;
  }
}

const INITIAL_STATE: BookFormState = {
  title: "",
  author: "",
  genre: "",
  tagsInput: "",
  description: "",
  thoughts: "",
  coverImageUrl: "",
};

const sectionTitleClass =
  "mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-(--theme-accent-primary)";

const inputClass =
  "w-full nb-input px-4 py-3 text-sm placeholder:text-(--theme-text-muted) focus-within:ring-2 focus-within:ring-(--theme-focus) max-md:px-3 max-md:py-2 max-md:text-xs";

const textareaClass = `${inputClass} resize-none`;

/** Показывает теги в виде цветных плашек */
function TagPills({
  tags,
  size = "sm",
}: {
  tags: string[];
  size?: "sm" | "xs";
}) {
  const sizeClass =
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 rounded-full border-(--theme-accent-primary)/30 bg-(--theme-accent-primary)/10 font-medium text-(--theme-accent-primary) ${sizeClass}`}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}

function StarDisplay({ value, size = 14 }: { value: number; size?: number }) {
  const stars = [];
  const normalized = value / 2;
  for (let i = 0; i < 5; i++) {
    const fill = Math.min(1, Math.max(0, normalized - i));
    stars.push(
      <span
        key={i}
        className="relative inline-block"
        style={{ width: size, height: size }}
      >
        <Star size={size} className="absolute inset-0 text-(--theme-text-muted)/60" />
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${fill * 100}%` }}
        >
          <Star size={size} className="text-amber-400" fill="#fbbf24" />
        </span>
      </span>,
    );
  }
  return <span className="inline-flex items-center gap-0.5">{stars}</span>;
}

export const BookEditModal = ({
  isOpen,
  onClose,
  book,
  tierListId,
  onSave,
}: BookEditModalProps) => {
  const [state, dispatch] = useReducer(bookFormReducer, INITIAL_STATE);
  const [isCoverDeleteModalOpen, setIsCoverDeleteModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    title,
    author,
    genre,
    tagsInput,
    description,
    thoughts,
    coverImageUrl,
  } = state;

  // Rating state
  const [pollRatings, setPollRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [reVoting, setReVoting] = useState(false);
  const [averages, setAverages] = useState<BookRatingsResult | null>(null);
  const [voteError, setVoteError] = useState("");
  const { user } = useAuth();

  const loadRatings = useCallback(async () => {
    if (!book?.id) return;
    const bookIdNum = Number(book.id);
    if (!Number.isFinite(bookIdNum)) return;
    try {
      const [avg, mine] = await Promise.all([
        getBookRatings(bookIdNum),
        user ? getUserBookRating(bookIdNum) : Promise.resolve(null),
      ]);
      if (avg) setAverages(avg);
      if (mine) {
        setHasVoted(true);
        setPollRatings(mine.ratings || {});
      }
    } catch {
      /* ignore */
    }
  }, [book, user]);

  useEffect(() => {
    if (!isOpen || !book) return;
    setPollRatings({});
    setSubmitting(false);
    setVoteError("");
    setAverages(null);
    setHasVoted(false);
    setReVoting(false);
    loadRatings();
  }, [isOpen, book, loadRatings]);

  const handleRate = (category: string, value: number) => {
    setPollRatings((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmitRating = async () => {
    if (!user || !book?.id) return;
    const bookIdNum = Number(book.id);
    if (!Number.isFinite(bookIdNum)) return;
    const entries = Object.entries(pollRatings);
    if (entries.length === 0) return;
    setSubmitting(true);
    setVoteError("");
    try {
      await rateBook(bookIdNum, pollRatings);
      setHasVoted(true);
      setReVoting(false);
      loadRatings();
    } catch {
      setVoteError("Ошибка при отправке оценки");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRating = () => {
    setReVoting(true);
    setHasVoted(false);
  };

  const allCategories = RATING_CATEGORIES.map((c) => ({
    ...c,
    userValue: pollRatings[c.key],
    avgValue: averages?.averages?.[c.key],
  }));

  const pollComplete =
    allCategories.some((c) => c.userValue !== undefined) &&
    allCategories.filter((c) => c.userValue !== undefined).length >= 1;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !book || !tierListId) return;

    if (file.size > 5 * 1024 * 1024) {
      sileo.error({
        title: "Файл слишком большой",
        description: "Максимум 5 MB",
      });
      return;
    }

    setUploading(true);
    try {
      const result = await uploadBookCover(tierListId, book.id, file);
      dispatch({
        type: "SET_COVER_IMAGE_URL",
        coverImageUrl: result.coverImageUrl,
      });
      sileo.success({ title: "Обложка обновлена" });
    } catch {
      sileo.error({ title: "Ошибка загрузки обложки" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveAndClose = () => {
    if (!book) {
      handleClose();
      return;
    }
    onSave(book.id, {
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim() || undefined,
      tags: parseTags(tagsInput),
      description: description.trim() || undefined,
      thoughts: thoughts.trim() || undefined,
      coverImageUrl,
    });
    handleClose();
  };

  const handleAiDescribe = useCallback(async () => {
    if (!title.trim()) {
      sileo.warning({ title: "Сначала введите название книги" });
      return;
    }
    setAiLoading(true);
    try {
      const desc = await generateBookDescription(title.trim(), author.trim());
      if (desc) {
        dispatch({ type: "SET_DESCRIPTION", description: desc });
        sileo.success({ title: "Описание сгенерировано" });
      }
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: "generateBookDescription",
      });
      sileo.error({ title: "Не удалось сгенерировать описание" });
    } finally {
      setAiLoading(false);
    }
  }, [title, author]);

  const handleClose = () => {
    dispatch({ type: "RESET" });
    setIsCoverDeleteModalOpen(false);
    onClose();
  };

  useEffect(() => {
    if (book && isOpen) {
      logger.info("Book edit modal opened", {
        bookId: book.id,
        bookTitle: book.title,
      });
      dispatch({ type: "SET_BOOK", book });
    }
  }, [book, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSaveAndClose();
    }
  };

  const parsedTags = parseTags(tagsInput);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSaveAndClose}
      className="w-full max-w-[min(92vw,720px)] max-md:mx-2 max-md:min-w-0"
      titleId="book-edit-title"
    >
      <div
        className="relative flex max-h-[90dvh] w-full flex-col overflow-hidden nb-heavy-border bg-(--theme-surface-3) text-(--theme-text)"
        onKeyDown={handleKeyDown}
      >
        <button
          onClick={handleSaveAndClose}
          className="absolute right-4 top-4 z-20 flex size-7 cursor-pointer items-center justify-center nb-heavy-border bg-(--theme-surface-4) text-(--theme-text-muted) transition-colors hover:border-(--theme-accent-primary) hover:text-(--theme-text) focus-visible:ring-2 focus-visible:ring-(--theme-danger) outline-none"
          title="Закрыть"
          aria-label="Закрыть модальное окно"
        >
          <X size={14} />
        </button>

        <div className="border-b-(--theme-border-width) border-(--theme-border) bg-(--theme-surface-2) px-5 py-4 max-md:px-3 max-md:py-3">
          <div className="pr-12 max-md:pr-0">
            <p
              id="book-edit-title"
              className="mb-1.5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-(--theme-accent-primary)"
            >
              Редактирование книги
              <span className="inline-flex items-center gap-1 rounded-full border-(--theme-accent-primary)/20 bg-(--theme-accent-primary)/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-(--theme-accent-primary)/70">
                автосохранение
              </span>
            </p>

            {/* Строка: Название + Автор */}
            <div className="grid grid-cols-[1fr_1fr] gap-4 max-md:grid-cols-1">
              <div>
                <label
                  htmlFor="book-title-input"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-(--theme-text-muted)"
                >
                  Название{" "}
                  <span className="text-pink-500" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="book-title-input"
                  type="text"
                  value={title}
                  onChange={(e) =>
                    dispatch({ type: "SET_TITLE", title: e.target.value })
                  }
                  maxLength={100}
                  className="w-full nb-input px-4 py-2 text-lg font-black placeholder:text-(--theme-text-muted) focus-within:ring-2 focus-within:ring-(--theme-focus) max-md:text-base"
                  placeholder="Введите название книги"
                  aria-label="Название книги"
                />
                <span className="mt-1 block text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {title.length}/100
                </span>
              </div>
              <div>
                <label
                  htmlFor="book-author-input"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-(--theme-text-muted)"
                >
                  Автор
                </label>
                <AuthorInput
                  value={author}
                  onChange={(val) =>
                    dispatch({ type: "SET_AUTHOR", author: val })
                  }
                  maxLength={100}
                  inputClass={inputClass}
                  placeholder="Автор книги"
                />
                <span className="mt-1 block text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {author.length}/100
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-(--theme-surface-3) p-6 max-md:p-3">
          <div className="flex flex-col gap-6 max-md:gap-4">
            <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)] max-md:grid-cols-1">
              <section className="nb-heavy-border bg-(--theme-surface-2) p-3 max-md:p-2">
                <p className={`${sectionTitleClass} text-center`}>Обложка</p>
                <div className="relative mx-auto h-64 w-40 overflow-hidden nb-heavy-border bg-(--theme-surface-4) max-sm:h-56">
                  {coverImageUrl ? (
                    <RetryableImage
                      src={proxyImageUrl(coverImageUrl)}
                      alt={(book?.title ?? title) || "Обложка книги"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = (e.currentTarget ?? (e.target as HTMLImageElement | null)) as HTMLImageElement | null;
                        if (!target) return;
                        target.style.display = "none";
                        target.parentElement
                          ?.querySelector(".placeholder-fallback")
                          ?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`placeholder-fallback ${coverImageUrl ? "hidden" : ""} absolute inset-0`}
                  >
                    <BookCoverPlaceholder />
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 max-md:gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-hidden="true"
                  />
                  {coverImageUrl ? (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full cursor-pointer nb-heavy-border bg-(--theme-surface-4) px-3 py-2 text-sm font-semibold text-(--theme-accent-primary) transition-colors hover:border-(--theme-accent-primary) hover:bg-(--theme-surface-2) focus-visible:ring-2 focus-visible:ring-(--theme-focus) outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Изменить обложку"
                      >
                        {uploading ? "Загрузка..." : "Изменить"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCoverDeleteModalOpen(true)}
                        className="w-full cursor-pointer nb-heavy-border bg-(--theme-surface-4) px-3 py-2 text-sm font-semibold text-(--theme-danger) transition-colors hover:border-(--theme-danger) hover:bg-(--theme-surface-2) hover:text-(--theme-danger) focus-visible:ring-2 focus-visible:ring-(--theme-danger) outline-none"
                        aria-label="Удалить текущую обложку"
                      >
                        Удалить обложку
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full cursor-pointer nb-heavy-border bg-(--theme-surface-4) px-3 py-2 text-sm font-semibold text-(--theme-accent-primary) transition-colors hover:border-(--theme-accent-primary) hover:bg-(--theme-surface-2) focus-visible:ring-2 focus-visible:ring-(--theme-focus) outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Добавить обложку"
                    >
                      {uploading ? "Загрузка..." : "Добавить"}
                    </button>
                  )}
                </div>
              </section>

              <div className="grid gap-6">
                <div className="grid grid-cols-1 gap-4">
                  <section className="nb-heavy-border bg-(--theme-surface-2) p-4 max-md:p-3">
                    <label
                      htmlFor="book-genre-input"
                      className={`${sectionTitleClass} max-md:text-[9px]`}
                    >
                      Жанр
                    </label>
                    <input
                      id="book-genre-input"
                      type="text"
                      value={genre}
                      onChange={(e) =>
                        dispatch({ type: "SET_GENRE", genre: e.target.value })
                      }
                      maxLength={50}
                      className="w-full nb-input px-4 py-2 text-lg font-black placeholder:text-(--theme-text-muted) focus-within:ring-2 focus-within:ring-(--theme-focus) max-md:text-base"
                      placeholder="Фантастика, детектив..."
                      aria-label="Жанр книги"
                    />
                  </section>

                  <section className="nb-heavy-border bg-(--theme-surface-2) p-4 max-md:p-3">
                    <label
                      htmlFor="book-tags-input"
                      className={`${sectionTitleClass} max-md:text-[9px]`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Hash size={12} />
                        Теги
                      </span>
                    </label>
                    <input
                      id="book-tags-input"
                      type="text"
                      value={tagsInput}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_TAGS_INPUT",
                          tagsInput: e.target.value,
                        })
                      }
                      className={`${inputClass} focus-visible:ring-2 focus-visible:ring-(--theme-focus)`}
                      placeholder="#фантастика #приключения"
                      aria-label="Теги книги"
                    />
                    <div className="mt-2">
                      <TagPills tags={parsedTags} size="xs" />
                    </div>
                  </section>
                </div>

                <section className="nb-heavy-border bg-(--theme-surface-2) p-4 max-md:p-3">
                  <div className="flex items-center justify-between mb-3 max-md:flex-col max-md:items-start max-md:gap-2">
                    <label
                      htmlFor="book-description-input"
                      className={sectionTitleClass}
                    >
                      Описание
                    </label>
                    <button
                      type="button"
                      onClick={handleAiDescribe}
                      disabled={aiLoading || !title.trim()}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded border-(--theme-accent-primary)/30 bg-(--theme-accent-primary)/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-(--theme-accent-primary) transition-colors hover:bg-(--theme-accent-primary)/20 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Сгенерировать описание через AI"
                      aria-label="Сгенерировать описание через AI"
                    >
                      {aiLoading ? (
                        <Loader size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      {aiLoading ? "Генерация..." : "AI"}
                    </button>
                  </div>
                  <textarea
                    id="book-description-input"
                    value={description}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_DESCRIPTION",
                        description: e.target.value,
                      })
                    }
                    className={`${textareaClass} min-h-40 max-md:min-h-45 focus-visible:ring-2 focus-visible:ring-(--theme-focus)`}
                    placeholder="Краткое описание книги"
                    aria-label="Описание книги"
                  />
                </section>
              </div>
            </div>

            <section className="nb-heavy-border bg-(--theme-surface-2) p-4 max-md:p-3">
              <label
                htmlFor="book-thoughts-input"
                className={`${sectionTitleClass} max-md:text-[9px]`}
              >
                Мои мысли
              </label>
              <textarea
                id="book-thoughts-input"
                value={thoughts}
                onChange={(e) =>
                  dispatch({ type: "SET_THOUGHTS", thoughts: e.target.value })
                }
                className={`${textareaClass} min-h-36 focus-visible:ring-2 focus-visible:ring-(--theme-focus)`}
                rows={5}
                placeholder="Ваши мысли, заметки и впечатления о книге"
                aria-label="Ваши мысли о книге"
              />
            </section>

            {/* Rating Section */}
            <section className="nb-heavy-border bg-(--theme-surface-2) p-4 max-md:p-3">
              <span
                className={`${sectionTitleClass} flex items-center gap-2 max-md:text-[9px]`}
              >
                <Star size={14} />
                Оценка книги
              </span>

              {hasVoted && !reVoting ? (
                <div className="mt-2">
                  {averages ? (
                    <div className="space-y-2">
                      {allCategories.map((cat) => (
                        <div
                          key={cat.key}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-(--theme-text-muted)">{cat.label}</span>
                          <span className="flex items-center gap-2">
                            <StarDisplay value={cat.avgValue ?? 0} size={12} />
                            <span className="text-(--theme-text) font-medium w-8 text-right text-xs">
                              {cat.avgValue?.toFixed(1) ?? "—"}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-(--theme-text-muted) mt-2">Нет оценок</p>
                  )}
                  <button
                    type="button"
                    onClick={handleChangeRating}
                    className="mt-2 cursor-pointer text-xs text-(--theme-accent-primary) underline underline-offset-2 transition-colors hover:text-(--theme-accent-primary) focus-visible:ring-2 focus-visible:ring-(--theme-focus) outline-none"
                  >
                    Изменить оценку
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 mt-2">
                  {allCategories.map((cat) => (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-(--theme-text-muted)">{cat.label}</span>
                        <span className="text-(--theme-accent-primary) font-semibold text-xs">
                          {cat.userValue !== undefined
                            ? cat.userValue.toFixed(1)
                            : "—"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={cat.userValue ?? 0}
                        onChange={(e) =>
                          handleRate(cat.key, parseFloat(e.target.value))
                        }
                        className="w-full h-1 rounded-full appearance-none cursor-pointer
                          bg-(--theme-surface-2) accent-(--theme-accent-primary)
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-3.5
                          [&::-webkit-slider-thumb]:h-3.5
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-(--theme-accent-primary)
                          [&::-webkit-slider-thumb]:border-2
                          [&::-webkit-slider-thumb]:border-(--theme-border)"
                      />
                    </div>
                  ))}

                  {voteError && (
                    <div className="text-xs text-red-400">{voteError}</div>
                  )}

                  {user ? (
                    <button
                      onClick={handleSubmitRating}
                      disabled={!pollComplete || submitting}
                      className="w-full mt-1 py-2 bg-(--theme-accent-primary) text-black font-semibold rounded-sm text-xs
                        hover:bg-(--theme-accent-primary)/90 transition-colors
                        disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? "Отправка..." : "Оценить"}
                    </button>
                  ) : (
                    <p className="text-xs text-(--theme-text-muted) mt-2">
                      Войдите, чтобы оценить книгу
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t-(--theme-border-width) border-(--theme-border) bg-(--theme-surface-4) px-5 py-3 max-md:px-3 max-md:py-2">
          <Button
            variant="ghost"
            onClick={handleSaveAndClose}
            className="nb-heavy-border bg-transparent px-4 py-2 text-sm font-semibold text-(--theme-text-muted) hover:border-(--theme-accent-primary) hover:bg-(--theme-surface-2) hover:text-(--theme-text) focus-visible:ring-2 focus-visible:ring-(--theme-danger) max-md:w-full"
            aria-label="Закрыть"
          >
            Закрыть
          </Button>
        </div>
      </div>

      <EditorConfirmModal
        isOpen={isCoverDeleteModalOpen}
        onClose={() => setIsCoverDeleteModalOpen(false)}
        onConfirm={() => {
          dispatch({ type: "SET_COVER_IMAGE_URL", coverImageUrl: "" });
          setIsCoverDeleteModalOpen(false);
        }}
        title="Удалить обложку?"
        titleId="delete-cover-title"
        confirmLabel="Удалить"
        description={
          <p>Обложка будет удалена из книги после сохранения изменений.</p>
        }
      />
    </Modal>
  );
};
