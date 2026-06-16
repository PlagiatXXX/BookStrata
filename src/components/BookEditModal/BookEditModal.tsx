import { useReducer, useEffect, useState, useCallback } from "react";
import { X, Star, Hash } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import type { Book } from "@/types";
import { createLogger } from "@/lib/logger";
import { EditorConfirmModal } from "@/components/EditorModals/EditorConfirmModal";
import { RATING_CATEGORIES, rateBook, getBookRatings, getUserBookRating } from "@/lib/ratingsApi";
import type { BookRatingsResult } from "@/lib/ratingsApi";
import { useAuth } from "@/hooks/useAuthContext";

const logger = createLogger("BookEditModal", { color: "cyan" });

interface BookEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
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
  "mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#c1fffe]";

const inputClass =
  "w-full border-2 border-black bg-[#0a0a0a] px-4 py-3 text-sm text-[#f6f1e8] placeholder:text-[#676767] outline-none transition-colors focus:border-[#c1fffe]";

const textareaClass = `${inputClass} resize-none`;

/** Показывает теги в виде цветных плашек */
function TagPills({ tags, size = "sm" }: { tags: string[]; size?: "sm" | "xs" }) {
  const sizeClass = size === "sm" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 font-medium text-cyan-300 ${sizeClass}`}
        >
          <Hash size={size === "sm" ? 10 : 8} />
          {tag}
        </span>
      ))}
    </div>
  );
}

function StarDisplay({ value, size = 14 }: { value: number; size?: number }) {
  const stars = []
  const normalized = value / 2
  for (let i = 0; i < 5; i++) {
    const fill = Math.min(1, Math.max(0, normalized - i))
    stars.push(
      <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
        <Star size={size} className="absolute inset-0 text-[#444]" />
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <Star size={size} className="text-amber-400" fill="#fbbf24" />
        </span>
      </span>,
    )
  }
  return <span className="inline-flex items-center gap-0.5">{stars}</span>
}

export const BookEditModal = ({
  isOpen,
  onClose,
  book,
  onSave,
}: BookEditModalProps) => {
  const [state, dispatch] = useReducer(bookFormReducer, INITIAL_STATE);
  const [isCoverDeleteModalOpen, setIsCoverDeleteModalOpen] = useState(false);
  const { title, author, genre, tagsInput, description, thoughts, coverImageUrl } = state;

  // Rating state
  const [pollRatings, setPollRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [reVoting, setReVoting] = useState(false);
  const [averages, setAverages] = useState<BookRatingsResult | null>(null);
  const [voteError, setVoteError] = useState("");
  const { user } = useAuth();

  const loadRatings = useCallback(async () => {
    if (!book?.id) return
    const bookIdNum = Number(book.id);
    if (!Number.isFinite(bookIdNum)) return;
    try {
      const [avg, mine] = await Promise.all([
        getBookRatings(bookIdNum),
        user ? getUserBookRating(bookIdNum) : Promise.resolve(null),
      ])
      if (avg) setAverages(avg)
      if (mine) {
        setHasVoted(true);
        setPollRatings(mine.ratings || {});
      }
    } catch { /* ignore */ }
  }, [book, user])

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
    setPollRatings((prev) => ({ ...prev, [category]: value }))
  }

  const handleSubmitRating = async () => {
    if (!user || !book?.id) return
    const bookIdNum = Number(book.id);
    if (!Number.isFinite(bookIdNum)) return;
    const entries = Object.entries(pollRatings)
    if (entries.length === 0) return
    setSubmitting(true)
    setVoteError("")
    try {
      await rateBook(bookIdNum, pollRatings)
      setHasVoted(true)
      setReVoting(false)
      loadRatings()
    } catch {
      setVoteError("Ошибка при отправке оценки")
    } finally {
      setSubmitting(false)
    }
  }

  const handleChangeRating = () => {
    setReVoting(true)
    setHasVoted(false)
  }

  const allCategories = RATING_CATEGORIES.map((c) => ({
    ...c,
    userValue: pollRatings[c.key],
    avgValue: averages?.averages?.[c.key],
  }))

  const pollComplete = allCategories.some((c) => c.userValue !== undefined) &&
    allCategories.filter((c) => c.userValue !== undefined).length >= 1

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
        className="max-w-[65vw] min-w-[700px] max-md:min-w-0 max-md:max-w-full"
        titleId="book-edit-title"
      >
      <div
        className="relative flex max-h-[90vh] w-full flex-col overflow-hidden bg-[#111111] text-[#f6f1e8]"
        onKeyDown={handleKeyDown}
      >
        <button
          onClick={handleSaveAndClose}
          className="absolute right-4 top-4 z-20 flex size-7 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8] focus-visible:ring-2 focus-visible:ring-pink-500 outline-none"
          title="Закрыть"
          aria-label="Закрыть модальное окно"
        >
          <X size={14} />
        </button>

        <div className="border-b-2 border-black bg-[#181818] px-5 py-4">
          <div className="pr-12">
            <p
              id="book-edit-title"
              className="mb-1.5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c1fffe]"
            >
              Редактирование книги
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300/70">
                автосохранение
              </span>
            </p>

            {/* Строка: Название + Жанр */}
            <div className="grid grid-cols-[1fr_1fr] gap-4">
              <div>
                <label
                  htmlFor="book-title-input"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa1a3]"
                >
                  Название <span className="text-pink-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="book-title-input"
                  type="text"
                  value={title}
                  onChange={(e) =>
                    dispatch({ type: "SET_TITLE", title: e.target.value })
                  }
                  autoFocus
                  maxLength={100}
                  className="w-full border-2 border-black bg-[#0a0a0a] px-4 py-2 text-lg font-black text-[#f6f1e8] placeholder:text-[#5e5e5e] outline-none transition-colors focus:border-[#c1fffe] focus-visible:ring-2 focus-visible:ring-cyan-400 max-md:text-base"
                  placeholder="Введите название книги"
                  aria-label="Название книги"
                />
                <span className="mt-1 block text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {title.length}/100
                </span>
              </div>
              <div>
                <label
                  htmlFor="book-genre-input"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa1a3]"
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
                  className="w-full border-2 border-black bg-[#0a0a0a] px-4 py-2 text-lg font-black text-[#f6f1e8] placeholder:text-[#5e5e5e] outline-none transition-colors focus:border-[#c1fffe] focus-visible:ring-2 focus-visible:ring-cyan-400 max-md:text-base"
                  placeholder="Фантастика, детектив..."
                  aria-label="Жанр книги"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#111111] p-6">
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
              <section className="border-2 border-black bg-[#171717] p-3">
                <p className={`${sectionTitleClass} text-center`}>Обложка</p>
                <div className="mx-auto h-64 w-40 overflow-hidden border-2 border-black bg-[#0a0a0a] max-sm:h-56">
                  {coverImageUrl ? (
                    <img
                      src={coverImageUrl}
                      alt={(book?.title ?? title) || "Обложка книги"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='224'><rect fill='%23333' width='160' height='224'/><text fill='%23666' x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'>Нет обложки</text></svg>";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#6b6b6b]">
                      <span className="text-sm">Нет обложки</span>
                    </div>
                  )}
                </div>
                {coverImageUrl ? (
                  <button
                    type="button"
                    onClick={() => setIsCoverDeleteModalOpen(true)}
                    className="mt-3 w-full cursor-pointer border-2 border-black bg-[#0a0a0a] px-3 py-2 text-sm font-semibold text-[#ff9db7] transition-colors hover:border-[#ff5c8a] hover:bg-[#171717] hover:text-[#ffd4df] focus-visible:ring-2 focus-visible:ring-pink-500 outline-none"
                    aria-label="Удалить текущую обложку"
                  >
                    Удалить обложку
                  </button>
                ) : null}
              </section>

              <div className="grid gap-6">
                {/* Строка: Автор + Теги */}
                <div className="grid grid-cols-[1fr_1fr] gap-4">
                  <section className="border-2 border-black bg-[#171717] p-4">
                    <label
                      htmlFor="book-author-input"
                      className={sectionTitleClass}
                    >
                      Автор
                    </label>
                    <input
                      id="book-author-input"
                      type="text"
                      value={author}
                      onChange={(e) =>
                        dispatch({ type: "SET_AUTHOR", author: e.target.value })
                      }
                      maxLength={100}
                      className={`${inputClass} focus-visible:ring-2 focus-visible:ring-cyan-400`}
                      placeholder="Автор книги"
                      aria-label="Автор книги"
                    />
                    <span className="mt-1 block text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {author.length}/100
                    </span>
                  </section>

                  <section className="border-2 border-black bg-[#171717] p-4">
                    <label
                      htmlFor="book-tags-input"
                      className={sectionTitleClass}
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
                        dispatch({ type: "SET_TAGS_INPUT", tagsInput: e.target.value })
                      }
                      className={`${inputClass} focus-visible:ring-2 focus-visible:ring-cyan-400`}
                      placeholder="#фантастика #приключения"
                      aria-label="Теги книги"
                    />
                    <div className="mt-2">
                      <TagPills tags={parsedTags} size="xs" />
                    </div>
                  </section>
                </div>

                <section className="border-2 border-black bg-[#171717] p-4">
                  <label
                    htmlFor="book-description-input"
                    className={sectionTitleClass}
                  >
                    Описание
                  </label>
                  <textarea
                    id="book-description-input"
                    value={description}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_DESCRIPTION",
                        description: e.target.value,
                      })
                    }
                    className={`${textareaClass} min-h-40 focus-visible:ring-2 focus-visible:ring-cyan-400`}
                    placeholder="Краткое описание книги"
                    aria-label="Описание книги"
                  />
                </section>
              </div>
            </div>

            <section className="border-2 border-black bg-[#171717] p-4">
              <label
                htmlFor="book-thoughts-input"
                className={sectionTitleClass}
              >
                Мои мысли
              </label>
              <textarea
                id="book-thoughts-input"
                value={thoughts}
                onChange={(e) =>
                  dispatch({ type: "SET_THOUGHTS", thoughts: e.target.value })
                }
                className={`${textareaClass} min-h-36 focus-visible:ring-2 focus-visible:ring-cyan-400`}
                rows={5}
                placeholder="Ваши мысли, заметки и впечатления о книге"
                aria-label="Ваши мысли о книге"
              />
            </section>

            {/* Rating Section */}
            <section className="border-2 border-black bg-[#171717] p-4">
              <span className={`${sectionTitleClass} flex items-center gap-2`}>
                <Star size={14} />
                Оценка книги
              </span>

              {hasVoted && !reVoting ? (
                <div className="mt-2">
                  {averages ? (
                    <div className="space-y-2">
                      {allCategories.map((cat) => (
                        <div key={cat.key} className="flex items-center justify-between text-sm">
                          <span className="text-[#a0a0a0]">{cat.label}</span>
                          <span className="flex items-center gap-2">
                            <StarDisplay value={cat.avgValue ?? 0} size={12} />
                            <span className="text-[#f6f1e8] font-medium w-8 text-right text-xs">
                              {cat.avgValue?.toFixed(1) ?? "—"}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#555] mt-2">Нет оценок</p>
                  )}
                  <button
                    type="button"
                    onClick={handleChangeRating}
                    className="mt-2 cursor-pointer text-xs text-[#c1fffe] underline underline-offset-2 transition-colors hover:text-[#9cf5f3] focus-visible:ring-2 focus-visible:ring-cyan-400 outline-none"
                  >
                    Изменить оценку
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 mt-2">
                  {allCategories.map((cat) => (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#a0a0a0]">{cat.label}</span>
                        <span className="text-[#c1fffe] font-semibold text-xs">
                          {cat.userValue !== undefined ? cat.userValue.toFixed(1) : "—"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={cat.userValue ?? 0}
                        onChange={(e) => handleRate(cat.key, parseFloat(e.target.value))}
                        className="w-full h-1 rounded-full appearance-none cursor-pointer
                          bg-[#2a2a2a] accent-[#c1fffe]
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-3.5
                          [&::-webkit-slider-thumb]:h-3.5
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-[#c1fffe]
                          [&::-webkit-slider-thumb]:border-2
                          [&::-webkit-slider-thumb]:border-black"
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
                      className="w-full mt-1 py-2 bg-[#c1fffe] text-black font-semibold rounded-sm text-xs
                        hover:bg-[#a0f0f0] transition-colors
                        disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? "Отправка..." : "Оценить"}
                    </button>
                  ) : (
                    <p className="text-xs text-[#555] mt-2">
                      Войдите, чтобы оценить книгу
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t-2 border-black bg-[#0a0a0a] px-5 py-3">
          <Button
            variant="ghost"
            onClick={handleSaveAndClose}
            className="border-2 border-black bg-transparent px-4 py-2 text-sm font-semibold text-[#b4b4b4] hover:border-[#c1fffe] hover:bg-[#171717] hover:text-[#f6f1e8] focus-visible:ring-2 focus-visible:ring-pink-500"
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
          <>
            <p>Обложка будет удалена из книги после сохранения изменений.</p>
            <p className="mt-3">Это поможет избежать случайного удаления.</p>
          </>
        }
      />
    </Modal>
  );
};
