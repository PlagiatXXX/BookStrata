import { useReducer, useCallback, useState, memo } from "react";
import { Search, X, BookOpen, Plus, Eye } from "lucide-react";
import { addBookFromGoogleBooks, type OpenLibraryBook } from '@/lib/bookSearchApi';
import { createLogger } from "@/lib/logger";
import { sileo } from 'sileo';
import { BookViewModal } from "./BookViewModal";
import { useBookSearch } from "@/hooks/useBookSearch";
import { Spinner } from "@/components/Spinner";

// Логгер для компонента поиска книг
const logger = createLogger('BookSearchModal', { color: 'green' });

interface BookSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierListId: string;
  onBookAdded?: (
    book: {
      id: number;
      title: string;
      author: string | null;
      coverImageUrl: string;
    } | null,
  ) => void;
}

interface SearchState {
  query: string;
  selectedBooks: Set<string>;
  hasSearched: boolean;
}

type SearchAction =
  | { type: "SET_QUERY"; query: string }
  | { type: "TOGGLE_BOOK"; bookKey: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "RESET_SEARCH" }
  | { type: "SET_SEARCHED" };

const initialSearchState: SearchState = {
  query: "",
  selectedBooks: new Set(),
  hasSearched: false,
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "SET_QUERY":
      // Guard: Return current state if query hasn't changed to maintain referential integrity
      if (state.query === action.query) return state;
      return { ...state, query: action.query };
    case "TOGGLE_BOOK":
      { const newSet = new Set(state.selectedBooks);
      if (newSet.has(action.bookKey)) {
        newSet.delete(action.bookKey);
      } else {
        newSet.add(action.bookKey);
      }
      return { ...state, selectedBooks: newSet }; }
    case "CLEAR_SELECTION":
      // Guard: Return current state if selection is already empty
      if (state.selectedBooks.size === 0) return state;
      return { ...state, selectedBooks: new Set() };
    case "RESET_SEARCH":
      return { query: "", selectedBooks: new Set(), hasSearched: false };
    case "SET_SEARCHED":
      return { ...state, hasSearched: true, selectedBooks: new Set() };
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
  onToggle: (bookKey: string) => void;
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
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-[#7d8688]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="truncate font-semibold text-[#f6f1e8]">
          {book.title}
        </h3>
        <p className="truncate text-sm text-[#a8abad]">{book.author}</p>
        {book.publishYear && (
          <p className="mt-1 text-xs text-[#7d8688]">{book.publishYear}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(book);
          }}
          className="cursor-pointer border-2 border-black bg-[#0d0d0d] p-2 text-[#a8abad] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8]"
          title="Подробнее"
          aria-label="Подробнее"
        >
          <Eye className="w-5 h-5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(book.openLibraryKey);
          }}
          aria-label={isSelected ? "Убрать из выбранного" : "Добавить в выбранное"}
          className={`flex h-10 w-10 cursor-pointer items-center justify-center border-2 transition-colors ${
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
}: BookSearchModalProps) => {
  const [state, dispatch] = useReducer(searchReducer, initialSearchState);
  const [viewBook, setViewBook] = useState<OpenLibraryBook | null>(null);
  const [isViewAdding, setIsViewAdding] = useState(false);

  const {
    search,
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    totalResults,
    clearResults,
  } = useBookSearch({ cacheEnabled: true });

  const handleSearch = useCallback(async () => {
    if (!state.query.trim() || state.query.length < 2) return;

    dispatch({ type: "SET_SEARCHED" });
    await search(state.query);
  }, [state.query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Стабилизируем обработчики для memoized BookItem
  const handleToggleBookSelection = useCallback((key: string) => {
    dispatch({ type: "TOGGLE_BOOK", bookKey: key });
  }, []);

  const handleSetViewBook = useCallback((book: OpenLibraryBook) => {
    setViewBook(book);
  }, []);

  const handleAddSelectedBooks = async () => {
    if (state.selectedBooks.size === 0) return;

    const booksToAdd = results.filter((book) =>
      state.selectedBooks.has(book.openLibraryKey),
    );

    let successCount = 0;
    let lastAddedBook: {
      id: number;
      title: string;
      author: string | null;
      coverImageUrl: string;
    } | null = null;

    for (const book of booksToAdd) {
      try {
        const result = await addBookFromGoogleBooks(tierListId, book);
        successCount++;
        // result имеет формат { id, title, author, coverImageUrl }
        if (result && typeof result === "object") {
          lastAddedBook = result;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(err, {
          action: "addBookFromGoogleBooks",
          title: book.title,
        });

        // Проверяем ошибку лимита книг
        const errorMessage = err.message || "";
        const isLimitError = errorMessage.includes("Превышен лимит книг") || errorMessage.includes("лимит");

        if (isLimitError) {
          sileo.action({
            title: "Лимит книг",
            description: "Достигнуто максимальное количество книг в тир-листе (20). Оформите Pro для неограниченного количества.",
            duration: 3000,
            button: {
              title: "Оформить Pro",
              onClick: () => {
                // TODO: Здесь будет переход на страницу оплаты Pro-подписки
              },
            },
          });
          break; // Прекращаем добавление
        }

        // Проверяем различные форматы ошибок о отсутствии обложки
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
            title: `Не удалось добавить книгу`,
            description: `Ошибка при добавлении "${book.title}"`,
            duration: 3000
          });
        }
      }
    }

    if (successCount > 0) {
      sileo.success({ title: `Добавлено ${successCount} ${successCount === 1 ? "книга" : successCount < 5 ? "книги" : "книг"}`, duration: 3000 });
      onBookAdded?.(lastAddedBook);
      handleClose();
    }

    dispatch({ type: "CLEAR_SELECTION" });
  };

  const handleAddBookFromView = async (book: OpenLibraryBook) => {
    setIsViewAdding(true);
    try {
      const result = await addBookFromGoogleBooks(tierListId, book);
      sileo.success({ title: "Книга добавлена", duration: 3000 });
      onBookAdded?.(result);
      setViewBook(null);
      handleClose();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(err, { action: "addBookFromView", title: book.title });

      // Проверяем ошибку лимита книг
      const errorMessage = err.message || "";
      const isLimitError = errorMessage.includes("Превышен лимит книг") || errorMessage.includes("лимит");

      if (isLimitError) {
        sileo.action({
          title: "Лимит книг",
          description: "Достигнуто максимальное количество книг в тир-листе (20). Оформите Pro для неограниченного количества.",
          duration: 3000,
          button: {
            title: "Оформить Pro",
            onClick: () => {
              // TODO: Здесь будет переход на страницу оплаты Pro-подписки
            },
          },
        });
        setViewBook(null);
        handleClose();
        return;
      }

      // Проверяем различные форматы ошибок о отсутствии обложки
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

  const handleClose = () => {
    // Очищаем состояние перед закрытием
    dispatch({ type: "RESET_SEARCH" });
    clearResults();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <div
          role="button"
          tabIndex={0}
          className="absolute inset-0 cursor-pointer bg-black/75"
          onClick={handleClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClose();
            }
          }}
          aria-label="Закрыть модальное окно"
        />

        {/* Modal */}
        <div className="relative mx-4 flex w-full max-w-3xl flex-col overflow-hidden border-2 border-black bg-[#111111] text-[#f6f1e8] shadow-[8px_8px_0_0_#000000] animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-black bg-[#181818] p-5">
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
              <div className="row-span-2 flex size-10 items-center justify-center border-2 border-black bg-[#c1fffe] text-black">
                <BookOpen className="h-4 w-4" />
              </div>
              <p className="col-start-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#c1fffe]">
                Библиотека поиска
              </p>
              <h2 className="col-start-2 text-xl font-black tracking-[-0.02em] text-[#f6f1e8]">
                Найти книгу
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="flex size-10 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8]"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="border-b-2 border-black bg-[#141414] p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9aa1a3]">
              Поиск по названию или автору
            </p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7d8688]" />
                <input
                  type="text"
                  value={state.query}
                  onChange={(e) => dispatch({ type: "SET_QUERY", query: e.target.value })}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите название книги или автора..."
                  aria-label="Поиск книг"
                  autoFocus
                  className="w-full border-2 border-black bg-[#0a0a0a] py-3 pl-10 pr-10 text-[#f6f1e8] placeholder:text-[#6f7577] outline-none transition-colors focus:border-[#c1fffe]"
                />
                {state.query && (
                  <button
                    onClick={() => dispatch({ type: "SET_QUERY", query: "" })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#7d8688] hover:text-[#f6f1e8]"
                    aria-label="Очистить поиск"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={isLoading || state.query.length < 2}
                className="flex cursor-pointer items-center gap-2 border-2 border-black bg-[#c1fffe] px-6 py-3 font-black text-black transition-colors hover:bg-[#9cf5f3] disabled:cursor-not-allowed disabled:bg-[#5f6667] disabled:text-black disabled:opacity-100"
              >
                {isLoading ? <Spinner size="sm" /> : "Найти"}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[34rem] overflow-y-auto bg-[#111111] p-5">
            {/* Toolbar */}
            {results.length > 0 && (
              <div className="mb-4 flex items-center justify-between border-2 border-black bg-[#171717] px-4 py-3 animate-fade-in">
                <span className="text-sm text-[#a8abad]">
                  Найдено: {totalResults}
                </span>
                {state.selectedBooks.size > 0 && (
                  <button
                    onClick={handleAddSelectedBooks}
                    className="flex cursor-pointer items-center gap-2 border-2 border-black bg-[#c1fffe] px-4 py-2 text-sm font-black text-black animate-scale-in transition-colors hover:bg-[#9cf5f3]"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить выбранные ({state.selectedBooks.size})
                  </button>
                )}
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
                      isSelected={state.selectedBooks.has(book.openLibraryKey)}
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
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t-2 border-black bg-[#0a0a0a] p-5">
            <button
              onClick={handleClose}
              className="cursor-pointer border-2 border-black bg-transparent px-5 py-2.5 text-sm font-semibold text-[#b4b4b4] transition-colors hover:border-[#c1fffe] hover:bg-[#171717] hover:text-[#f6f1e8]"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>

      {/* Book View Modal */}
      <BookViewModal
        book={viewBook}
        isOpen={!!viewBook}
        onClose={() => setViewBook(null)}
        onAdd={handleAddBookFromView}
        isAdding={isViewAdding}
      />
    </>
  );
};
