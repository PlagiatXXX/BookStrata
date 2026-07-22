import { useReducer, useCallback, useState, memo, useEffect, useRef } from "react";
import { Search, X, BookOpen, Plus, Eye, User, Upload } from "lucide-react";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder/BookCoverPlaceholder";
import { batchAddBooksFromSearch, addBookFromGoogleBooks, importFromLiveLib, type OpenLibraryBook, type LiveLibBook } from '@/lib/bookSearchApi';
import { createLogger } from "@/lib/logger";
import { sileo } from 'sileo';
import { BookViewModal } from "@/components/BookViewModal/BookViewModal";
import { ImageUploader } from "@/components/ImageUploader/ImageUploader";
import { useBookSearch } from "@/hooks/useBookSearch";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { Spinner } from "@/components/Spinner";
import { apiTrackEvent } from "@/lib/analyticsApi";

// Логгер для компонента поиска книг
const logger = createLogger('BookSearchModal', { color: 'green' });

interface BookSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierListId: string;
  onBookAdded?: (
    books: Array<{
      id: number;
      title: string;
      author: string | null;
      coverImageUrl: string;
    }> | null,
  ) => void;
  onUploadBooks?: (files: File[]) => void;
}

interface SearchState {
  query: string;
  selectedBooks: Record<string, OpenLibraryBook>;
  hasSearched: boolean;
}

type SearchAction =
  | { type: "SET_QUERY"; query: string }
  | { type: "TOGGLE_BOOK"; book: OpenLibraryBook }
  | { type: "CLEAR_SELECTION" }
  | { type: "RESET_SEARCH" }
  | { type: "SET_SEARCHED" };

const initialSearchState: SearchState = {
  query: "",
  selectedBooks: {},
  hasSearched: false,
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "SET_QUERY":
      // Guard: Return current state if query hasn't changed to maintain referential integrity
      if (state.query === action.query) return state;
      return { ...state, query: action.query };
    case "TOGGLE_BOOK":
      { const key = action.book.openLibraryKey;
      const newSelected = { ...state.selectedBooks };
      if (key in newSelected) {
        delete newSelected[key];
      } else {
        newSelected[key] = action.book;
      }
      return { ...state, selectedBooks: newSelected }; }
    case "CLEAR_SELECTION":
      // Guard: Return current state if selection is already empty
      if (Object.keys(state.selectedBooks).length === 0) return state;
      return { ...state, selectedBooks: {} };
    case "RESET_SEARCH":
      return { query: "", selectedBooks: {}, hasSearched: false };
    case "SET_SEARCHED":
      return { ...state, hasSearched: true };
    default:
      return state;
  }
}

// Skeleton для результатов поиска
function BookSearchSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-2 border-black bg-[#171717] p-3 shadow-[4px_4px_0_0_#000000]"
        >
          <div className="h-24 w-16 shrink-0 border-2 border-black bg-[#232323] animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="mb-2 h-5 w-3/4 border-2 border-black bg-[#232323] animate-pulse" />
            <div className="h-4 w-1/2 border-2 border-black bg-[#232323] animate-pulse" />
          </div>
          <div className="h-10 w-10 border-2 border-black bg-[#232323] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// Skeleton для бесконечного скролла
function BookSkeletonItem() {
  return (
    <div className="flex items-center gap-4 border-2 border-black bg-[#171717] p-3 shadow-[4px_4px_0_0_#000000]">
      <div className="h-24 w-16 shrink-0 border-2 border-black bg-[#232323] animate-pulse" />
      <div className="flex-1 min-w-0">
        <div className="mb-2 h-5 w-3/4 border-2 border-black bg-[#232323] animate-pulse" />
        <div className="h-4 w-1/2 border-2 border-black bg-[#232323] animate-pulse" />
      </div>
      <div className="h-10 w-10 border-2 border-black bg-[#232323] animate-pulse" />
    </div>
  );
}

// Компонент книги с lazy loading обложки
const BookItem = memo(({
  book,
  isSelected,
  onToggle,
  onView,
}: {
  book: OpenLibraryBook;
  isSelected: boolean;
  onToggle: (book: OpenLibraryBook) => void;
  onView: (book: OpenLibraryBook) => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Пробуем загрузить обложку, при ошибке показываем placeholder
  const coverUrl = book.coverUrlLarge || book.coverUrl;
  const hasCover = coverUrl && !imageError;

  return (
    <div
      className={`flex cursor-pointer items-center gap-4 border-2 p-3 shadow-[4px_4px_0_0_#000000] transition-[transform,border-color,background-color,color] duration-150 animate-fade-in ${
        isSelected
          ? "border-[#c1fffe] bg-[#1d2323]"
          : "border-black bg-[#171717] hover:-translate-y-0.5 hover:border-[#c1fffe]"
      }`}
    >
      {/* Cover с lazy loading */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Просмотреть информацию о книге ${book.title}`}
        className="relative h-24 w-16 shrink-0 cursor-pointer overflow-hidden border-2 border-black bg-[#0a0a0a] transition-transform hover:scale-[1.02]"
        onClick={(e) => {
          e.stopPropagation();
          onView(book);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onView(book);
          }
        }}
      >
        {hasCover ? (
          <>
            {!imageLoaded && (
              <div className="h-full w-full bg-[#232323] animate-pulse" />
            )}
            <img
              key={coverUrl}
              src={coverUrl}
              alt={book.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                logger.warn('Failed to load cover', { coverUrl });
                setImageError(true);
              }}
            />
          </>
        ) : (
          <BookCoverPlaceholder compact />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="truncate text-sm font-semibold text-[#f6f1e8]">
          {book.title}
        </h3>
        <p className="truncate text-xs text-[#a8abad]">{book.author}</p>
        {book.publishYear && (
          <p className="mt-1 text-xs text-[#7d8688]">{book.publishYear}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onView(book);
          }}
          className="cursor-pointer border-2 border-black bg-[#0d0d0d] p-2 text-[#a8abad] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
          title="Подробнее"
          aria-label="Подробнее"
        >
          <Eye className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(book);
          }}
          aria-label={isSelected ? "Убрать из выбранного" : "Добавить в выбранное"}
          className={`flex h-10 w-10 cursor-pointer items-center justify-center border-2 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
            isSelected
              ? "border-black bg-[#c1fffe] text-black"
              : "border-black bg-[#0d0d0d] text-[#f6f1e8] hover:border-[#c1fffe] hover:bg-[#171717]"
          }`}
        >
          {isSelected ? (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <Plus className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
});

export const BookSearchModal = ({
  isOpen,
  onClose,
  tierListId,
  onBookAdded,
  onUploadBooks,
}: BookSearchModalProps) => {
  useBodyScrollLock(isOpen)

  const [state, dispatch] = useReducer(searchReducer, initialSearchState);
  const [viewBook, setViewBook] = useState<OpenLibraryBook | null>(null);
  const [isViewAdding, setIsViewAdding] = useState(false);
  const [isAddingBooks, setIsAddingBooks] = useState(false);

  // LiveLib import state
  const [activeTab, setActiveTab] = useState<"search" | "livelib" | "upload">("search");
  const [liveLibUsername, setLiveLibUsername] = useState("");
  const [liveLibResults, setLiveLibResults] = useState<LiveLibBook[]>([]);
  const [liveLibLoading, setLiveLibLoading] = useState(false);
  const [liveLibError, setLiveLibError] = useState<string | null>(null);
  const [liveLibSelected, setLiveLibSelected] = useState<Set<string>>(new Set());

  const {
    search,
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    totalResults,
    clearResults,
  } = useBookSearch({ cacheEnabled: true });

  const handleClose = useCallback(() => {
    dispatch({ type: "RESET_SEARCH" });
    clearResults();
    setIsAddingBooks(false);
    setIsViewAdding(false);
    setViewBook(null);
    setActiveTab("search");
    setLiveLibUsername("");
    setLiveLibResults([]);
    setLiveLibLoading(false);
    setLiveLibError(null);
    setLiveLibSelected(new Set());
    onClose();
  }, [clearResults, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, handleClose]);

  const handleSearch = useCallback(async () => {
    if (!state.query.trim() || state.query.length < 2) return;

    dispatch({ type: "SET_SEARCHED" });
    window.ym?.(109755750, 'reachGoal', 'book_search')
    apiTrackEvent('book_search', { query: state.query })
    await search(state.query);
  }, [state.query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Стабилизируем обработчики для memoized BookItem
  const handleToggleBookSelection = useCallback((book: OpenLibraryBook) => {
    dispatch({ type: "TOGGLE_BOOK", book });
  }, []);

  const handleSetViewBook = useCallback((book: OpenLibraryBook) => {
    setViewBook(book);
  }, []);

  const handleLiveLibImport = async () => {
    const username = liveLibUsername.trim();
    if (!username) return;

    setLiveLibLoading(true);
    setLiveLibError(null);
    setLiveLibResults([]);
    setLiveLibSelected(new Set());

    try {
      const books = await importFromLiveLib(username);
      setLiveLibResults(books);
      if (books.length === 0) {
        setLiveLibError("Список прочитанного пуст");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось загрузить книги";
      if (message.includes("не найден")) {
        setLiveLibError("Пользователь не найден на LiveLib");
      } else {
        setLiveLibError(message);
      }
      logger.error(err as Error, { action: "handleLiveLibImport", username });
    } finally {
      setLiveLibLoading(false);
    }
  };

  const handleLiveLibToggleBook = useCallback((book: OpenLibraryBook | LiveLibBook) => {
    const key = book.openLibraryKey;
    setLiveLibSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleAddAllSelected = async () => {
    const searchBooks = Object.values(state.selectedBooks);
    const liveLibBooks = liveLibResults.filter((book) =>
      liveLibSelected.has(book.openLibraryKey),
    );
    const allBooks = [...searchBooks, ...liveLibBooks];

    if (allBooks.length === 0) return;

    setIsAddingBooks(true);

    try {
      const addedBooks = await batchAddBooksFromSearch(tierListId, allBooks);

      dispatch({ type: "CLEAR_SELECTION" });
      setLiveLibSelected(new Set());
      setIsAddingBooks(false);

      if (addedBooks.length > 0) {
        const n = addedBooks.length;
        const lastDigit = n % 10;
        const lastTwoDigits = n % 100;
        const prefix = lastDigit === 1 && lastTwoDigits !== 11 ? "Добавлена" : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14) ? "Добавлены" : "Добавлено";
        const word = lastDigit === 1 && lastTwoDigits !== 11 ? "книга" : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14) ? "книги" : "книг";
        sileo.success({
          title: `${prefix} ${n} ${word}`,
          duration: 3000,
        });
        onBookAdded?.(addedBooks);
        handleClose();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(err, { action: "batchAddBooksFromSearch" });

      setIsAddingBooks(false);

      sileo.error({
        title: "Не удалось добавить книги",
        description: "Попробуйте снова позже",
        duration: 3000,
      });
    }
  };

  const handleAddBookFromView = async (book: OpenLibraryBook) => {
    setIsViewAdding(true);
    try {
      const result = await addBookFromGoogleBooks(tierListId, book);
      sileo.success({ title: "Книга добавлена", duration: 3000 });
      onBookAdded?.(result ? [result] : null);
      setViewBook(null);
      handleClose();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(err, { action: "addBookFromView", title: book.title });

      // Проверяем различные форматы ошибок о отсутствии обложки
      const errorMessage = err.message || "";
      const isNoCoverError =
        errorMessage.includes("no cover image") ||
        errorMessage.includes("Book has no cover") ||
        errorMessage.includes("cover");

      if (isNoCoverError) {
        sileo.error({ 
          title: `Нет обложки`, 
          description: `У книги "${book.title}" нет обложки`,
          duration: 3000 
        });
      } else {
        sileo.error({ 
          title: "Не удалось добавить книгу", 
          description: "Попробуйте другую книгу",
          duration: 3000 
        });
      }
    } finally {
      setIsViewAdding(false);
    }
  };

  const modalRef = useRef<HTMLDivElement>(null);

  // Focus the modal container on open so the browser doesn't auto-focus
  // the search input (which would pop the keyboard on mobile).
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const totalSelectedCount = Object.keys(state.selectedBooks).length + liveLibSelected.size;
  const overLimit = false;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        {/* Overlay */}
        <div
          className="absolute inset-0 cursor-pointer bg-black/75"
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-search-modal-title"
          tabIndex={-1}
          className="relative mx-4 flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden border-2 border-black bg-[#111111] text-[#f6f1e8] shadow-[8px_8px_0_0_#000000] animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-black bg-[#181818] p-5">
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
              <div className="row-span-2 flex size-10 items-center justify-center border-2 border-black bg-[#c1fffe] text-black">
                <BookOpen className="h-4 w-4" />
              </div>
              <p className="col-start-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#c1fffe]">
                Библиотека поиска
              </p>
              <h2
                id="book-search-modal-title"
                className="col-start-2 text-xl font-black tracking-[-0.02em] text-[#f6f1e8]"
              >
                Найти книгу
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex size-10 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs — компактные пилюли + кнопка добавления */}
          <div className="flex items-center gap-1.5 border-b-2 border-black bg-[#141414] px-5 py-2.5">
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
                activeTab === "search"
                  ? "bg-[#c1fffe] text-black"
                  : "text-[#7d8688] hover:text-[#f6f1e8]"
              }`}
            >
              <Search className="h-3 w-3 hidden sm:block" />
              <span className="sm:hidden">Поиск</span>
              <span className="hidden sm:inline">Поиск по названию</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("livelib")}
              className={`flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
                activeTab === "livelib"
                  ? "bg-[#c1fffe] text-black"
                  : "text-[#7d8688] hover:text-[#f6f1e8]"
              }`}
            >
              <User className="h-3 w-3 hidden sm:block" />
              <span className="sm:hidden">LiveLib</span>
              <span className="hidden sm:inline">Мои книги в LiveLib</span>
            </button>

            {onUploadBooks && (
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
                  activeTab === "upload"
                    ? "bg-[#c1fffe] text-black"
                    : "text-[#7d8688] hover:text-[#f6f1e8]"
                }`}
              >
                <Upload className="h-3 w-3 hidden sm:block" />
                <span>Загрузить</span>
              </button>
            )}

          </div>

          {/* Search Tab */}
          {activeTab === "search" && (
            <div className="border-b-2 border-black bg-[#141414] px-5 py-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8688]" />
                  <input
                    type="text"
                    value={state.query}
                    onChange={(e) => dispatch({ type: "SET_QUERY", query: e.target.value })}
                    onKeyDown={handleKeyDown}
                    placeholder="Название или автор..."
                    aria-label="Поиск книг"
                    className="w-full border-2 border-black bg-[#0a0a0a] py-2.5 pl-9 pr-9 text-sm text-[#f6f1e8] placeholder:text-[#6f7577] outline-none transition-colors focus:border-[#c1fffe] focus-within:ring-2 focus-within:ring-cyan-400"
                  />
                  {state.query && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "SET_QUERY", query: "" })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[#7d8688] hover:text-[#f6f1e8] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                      aria-label="Очистить поиск"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isLoading || isAddingBooks || state.query.length < 2}
                  className="flex cursor-pointer items-center gap-1.5 border-2 border-black bg-[#c1fffe] px-5 py-2.5 text-sm font-black text-black transition-colors hover:bg-[#9cf5f3] disabled:cursor-not-allowed disabled:bg-[#5f6667] disabled:text-black disabled:opacity-100 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                >
                  {isLoading ? <Spinner size="sm" /> : "Найти"}
                </button>
              </div>
            </div>
          )}

          {/* LiveLib Tab */}
          {activeTab === "livelib" && (
            <div className="border-b-2 border-black bg-[#141414] px-5 py-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8688]" />
                  <input
                    type="text"
                    value={liveLibUsername}
                    onChange={(e) => setLiveLibUsername(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLiveLibImport();
                    }}
                    placeholder="Username на LiveLib..."
                    aria-label="LiveLib username"
                    className="w-full border-2 border-black bg-[#0a0a0a] py-2.5 pl-9 pr-9 text-sm text-[#f6f1e8] placeholder:text-[#6f7577] outline-none transition-colors focus:border-[#c1fffe] focus-within:ring-2 focus-within:ring-cyan-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLiveLibImport}
                  disabled={liveLibLoading || !liveLibUsername.trim()}
                  className="flex cursor-pointer items-center gap-1.5 border-2 border-black bg-[#c1fffe] px-5 py-2.5 text-sm font-black text-black transition-colors hover:bg-[#9cf5f3] disabled:cursor-not-allowed disabled:bg-[#5f6667] disabled:text-black disabled:opacity-100 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                >
                  {liveLibLoading ? <Spinner size="sm" /> : "Загрузить"}
                </button>
              </div>
              {liveLibError && (
                <p className="mt-2 text-xs text-red-400">{liveLibError}</p>
              )}
            </div>
          )}

          {/* Results */}
          <div className="max-h-[55vh] min-h-[250px] overflow-y-auto bg-[#111111] p-5">
            {activeTab === "search" && (
              <>
                {/* Toolbar */}
                {results.length > 0 && (
                  <div className="mb-4 flex items-center justify-between border-2 border-black bg-[#171717] px-4 py-3 animate-fade-in">
                    <span className="text-sm text-[#a8abad]">
                      Найдено: {totalResults}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = results.every(
                          (b) => b.openLibraryKey in state.selectedBooks,
                        );
                        if (allSelected) {
                          // Deselect all
                          results.forEach((b) => {
                            if (b.openLibraryKey in state.selectedBooks) {
                              dispatch({ type: "TOGGLE_BOOK", book: b });
                            }
                          });
                        } else {
                          // Select all not yet selected
                          results.forEach((b) => {
                            if (!(b.openLibraryKey in state.selectedBooks)) {
                              dispatch({ type: "TOGGLE_BOOK", book: b });
                            }
                          });
                        }
                      }}
                      className="cursor-pointer text-xs font-bold text-[#c1fffe] transition-colors hover:text-[#9cf5f3] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                    >
                      {results.every((b) => b.openLibraryKey in state.selectedBooks)
                        ? "Снять всё"
                        : "Выбрать всё"}
                    </button>
                  </div>
                )}

                {/* Loading State */}
                {isLoading && <BookSearchSkeleton />}

                {/* Results List */}
                {!isLoading && (
                  <div className="space-y-2">
                    {results.map((book, index) => (
                      <div
                        key={book.openLibraryKey}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <BookItem
                          book={book}
                          isSelected={book.openLibraryKey in state.selectedBooks}
                          onToggle={handleToggleBookSelection}
                          onView={handleSetViewBook}
                        />
                      </div>
                    ))}

                    {/* Loading More */}
                    {isLoadingMore && (
                      <div className="space-y-2 mt-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <BookSkeletonItem key={i} />
                        ))}
                      </div>
                    )}

                    {/* Sentinel для infinite scroll */}
                    {hasMore && <div id="book-search-sentinel" className="h-4" />}

                    {/* Empty State */}
                    {results.length === 0 && !isLoading && state.hasSearched && (
                      <div className="border-2 border-dashed border-black bg-[#171717] py-12 text-center">
                        <BookOpen className="mx-auto mb-3 h-12 w-12 text-[#7d8688]" />
                        <p className="text-[#f6f1e8]">Ничего не найдено</p>
                        <p className="mt-1 text-sm text-[#8b9092]">
                          Проверьте правильность названия или попробуйте другой
                          запрос
                        </p>
                      </div>
                    )}

                    {/* Initial State */}
                    {results.length === 0 && !isLoading && !state.hasSearched && (
                      <div className="border-2 border-dashed border-black bg-[#171717] py-12 text-center">
                        <Search className="mx-auto mb-3 h-12 w-12 text-[#7d8688]" />
                        <p className="text-[#f6f1e8]">
                          Введите название книги или автора
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "livelib" && (
              <>
                {/* Toolbar */}
                {liveLibResults.length > 0 && (
                  <div className="mb-4 flex items-center justify-between border-2 border-black bg-[#171717] px-4 py-3 animate-fade-in">
                    <span className="text-sm text-[#a8abad]">
                      {liveLibResults.length} книг из LiveLib
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = liveLibResults.every((b) =>
                          liveLibSelected.has(b.openLibraryKey),
                        );
                        if (allSelected) {
                          setLiveLibSelected(new Set());
                        } else {
                          setLiveLibSelected(
                            new Set(liveLibResults.map((b) => b.openLibraryKey)),
                          );
                        }
                      }}
                      className="cursor-pointer text-xs font-bold text-[#c1fffe] transition-colors hover:text-[#9cf5f3] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                    >
                      {liveLibResults.every((b) =>
                        liveLibSelected.has(b.openLibraryKey),
                      )
                        ? "Снять всё"
                        : "Выбрать всё"}
                    </button>
                  </div>
                )}

                {/* Loading State */}
                {liveLibLoading && <BookSearchSkeleton />}

                {/* Results List */}
                {!liveLibLoading && (
                  <div className="space-y-2">
                    {liveLibResults.map((book, index) => (
                      <div
                        key={book.openLibraryKey}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <BookItem
                          book={book}
                          isSelected={liveLibSelected.has(book.openLibraryKey)}
                          onToggle={handleLiveLibToggleBook}
                          onView={handleSetViewBook}
                        />
                      </div>
                    ))}

                    {/* Empty State */}
                    {liveLibResults.length === 0 && !liveLibLoading && !liveLibError && (
                      <div className="border-2 border-dashed border-black bg-[#171717] py-12 text-center">
                        <User className="mx-auto mb-3 h-12 w-12 text-[#7d8688]" />
                        <p className="text-[#f6f1e8]">
                          Введите ваш username на LiveLib
                        </p>
                        <p className="mt-1 text-sm text-[#8b9092]">
                          LiveLib — крупнейшее сообщество читателей в Рунете
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "upload" && onUploadBooks && (
              <div className="flex flex-col items-center justify-center py-8">
                <ImageUploader onUpload={onUploadBooks} />
                <p className="mt-4 text-sm text-[#7d8688] text-center max-w-xs">
                  Загрузите изображения книг с вашего устройства
                </p>
                <p className="mt-1 text-xs text-[#5f6667] text-center">
                  JPEG, PNG, WebP, GIF. До 5 MB на файл
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t-2 border-black bg-[#0a0a0a] px-5 py-3">
            <div className="flex items-center gap-3">
              {totalSelectedCount > 0 && (
                <button
                  type="button"
                  onClick={handleAddAllSelected}
                  disabled={isAddingBooks || overLimit}
                  className={`flex cursor-pointer items-center gap-1.5 rounded px-3 py-2 text-xs font-black text-black transition-colors hover:bg-[#9cf5f3] disabled:cursor-not-allowed disabled:bg-[#5f6667] disabled:text-black disabled:opacity-100 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none animate-fade-in ${
                    overLimit ? "bg-[#ef4444]" : "bg-[#c1fffe]"
                  }`}
                >
                  {isAddingBooks ? (
                    <Spinner size="sm" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {isAddingBooks
                    ? "Добавление..."
                    : overLimit
                    ? `Лимит`
                    : `Добавить (${totalSelectedCount})`}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer border-2 border-[#4a4a4a] bg-[#1a1a1a] px-5 py-2 text-sm font-semibold text-[#d4d4d4] transition-colors hover:border-[#c1fffe] hover:bg-[#171717] hover:text-[#f6f1e8] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>

      {/* Book View Modal */}
      <BookViewModal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        book={viewBook as any}
        isOpen={!!viewBook}
        onClose={() => setViewBook(null)}
        onAdd={handleAddBookFromView}
        isAdding={isViewAdding}
      />
    </>
  );
};
