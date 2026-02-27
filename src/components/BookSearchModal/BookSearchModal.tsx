import { useState, useCallback, useEffect } from "react";
import { Search, X, BookOpen, Plus, Eye } from "lucide-react";
import { addBookFromGoogleBooks, type OpenLibraryBook } from '@/lib/bookSearchApi';
import { logger } from "@/lib/logger";
import { sileo } from 'sileo';
import { BookViewModal } from "./BookViewModal";
import { useBookSearch } from "@/hooks/useBookSearch";
import { Spinner } from "@/components/Spinner";

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

// Skeleton для результатов поиска
function BookSearchSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-cyan-300/35 bg-[rgba(7,13,30,0.8)] p-3"
        >
          <div className="h-24 w-16 shrink-0 rounded-[10px] bg-cyan-900/30 animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="mb-2 h-5 w-3/4 rounded bg-cyan-900/30 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-cyan-900/30 animate-pulse" />
          </div>
          <div className="h-10 w-10 rounded-[10px] bg-cyan-900/30 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// Skeleton для бесконечного скролла
function BookSkeletonItem() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-cyan-300/35 bg-[rgba(7,13,30,0.8)] p-3">
      <div className="h-24 w-16 shrink-0 rounded-[10px] bg-cyan-900/30 animate-pulse" />
      <div className="flex-1 min-w-0">
        <div className="mb-2 h-5 w-3/4 rounded bg-cyan-900/30 animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-cyan-900/30 animate-pulse" />
      </div>
      <div className="h-10 w-10 rounded-[10px] bg-cyan-900/30 animate-pulse" />
    </div>
  );
}

// Компонент книги с lazy loading обложки
function BookItem({
  book,
  isSelected,
  onToggle,
  onView,
}: {
  book: OpenLibraryBook;
  isSelected: boolean;
  onToggle: () => void;
  onView: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Пробуем загрузить обложку, при ошибке показываем placeholder
  const coverUrl = book.coverUrlLarge || book.coverUrl;
  const hasCover = coverUrl && !imageError;

  return (
    <div
      className={`flex cursor-pointer items-center gap-4 rounded-xl border p-3 transition-colors duration-200 animate-fade-in ${
        isSelected
          ? "border-fuchsia-300/70 bg-[rgba(255,0,204,0.14)]"
          : "border-cyan-300/35 bg-[rgba(7,13,30,0.8)] hover:border-fuchsia-300/55 hover:translate-x-1"
      }`}
    >
      {/* Cover с lazy loading */}
      <div
        className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[10px] border border-cyan-300/40 bg-[rgba(6,12,28,0.9)] transition-transform hover:scale-105"
        onClick={(e) => {
          e.stopPropagation();
          onView();
        }}
      >
        {hasCover ? (
          <>
            {!imageLoaded && (
              <div className="h-full w-full bg-cyan-900/30 animate-pulse" />
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
            <BookOpen className="h-6 w-6 text-cyan-200/50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="truncate font-semibold text-[#e8ffff]">
          {book.title}
        </h3>
        <p className="truncate text-sm text-cyan-200/75">{book.author}</p>
        {book.publishYear && (
          <p className="mt-1 text-xs text-cyan-200/55">{book.publishYear}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="cursor-pointer rounded-lg border border-cyan-300/35 p-2 text-cyan-200/75 transition-colors hover:border-fuchsia-300/60 hover:text-fuchsia-200"
          title="Подробнее"
        >
          <Eye className="w-5 h-5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border transition-colors ${
            isSelected
              ? "border-fuchsia-300/70 bg-fuchsia-500/90 text-[#05070e]"
              : "border-cyan-300/45 text-cyan-100 hover:border-fuchsia-300/65 hover:text-fuchsia-100"
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
}

export const BookSearchModal = ({
  isOpen,
  onClose,
  tierListId,
  onBookAdded,
}: BookSearchModalProps) => {
  const [query, setQuery] = useState("");
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [viewBook, setViewBook] = useState<OpenLibraryBook | null>(null);
  const [isViewAdding, setIsViewAdding] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
    if (!query.trim() || query.length < 2) return;

    setHasSearched(true);
    setSelectedBooks(new Set());
    await search(query);
  }, [query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const toggleBookSelection = (key: string) => {
    setSelectedBooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleAddSelectedBooks = async () => {
    if (selectedBooks.size === 0) return;

    const booksToAdd = results.filter((book) =>
      selectedBooks.has(book.openLibraryKey),
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

        // Проверяем различные форматы ошибок о отсутствии обложки
        const errorMessage = err.message || "";
        const isNoCoverError =
          errorMessage.includes("no cover image") ||
          errorMessage.includes("Book has no cover") ||
          errorMessage.includes("cover");

        if (isNoCoverError) {
          sileo.error({ title: `У книги "${book.title}" нет обложки`, duration: 3000 });
        } else {
          sileo.error({ title: `Не удалось добавить: ${book.title}`, duration: 3000 });
        }
      }
    }

    if (successCount > 0) {
      sileo.success({ title: `Добавлено ${successCount} ${successCount === 1 ? "книга" : successCount < 5 ? "книги" : "книг"}`, duration: 3000 });
      onBookAdded?.(lastAddedBook);
      handleClose();
    }

    setSelectedBooks(new Set());
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

      // Проверяем различные форматы ошибок о отсутствии обложки
      const errorMessage = err.message || "";
      const isNoCoverError =
        errorMessage.includes("no cover image") ||
        errorMessage.includes("Book has no cover") ||
        errorMessage.includes("cover");

      if (isNoCoverError) {
        sileo.error({ title: `У книги "${book.title}" нет обложки`, duration: 3000 });
      } else {
        sileo.error({ title: "Не удалось добавить книгу", duration: 3000 });
      }
    } finally {
      setIsViewAdding(false);
    }
  };

  const handleClose = () => {
    setQuery("");
    setSelectedBooks(new Set());
    setHasSearched(false);
    clearResults();
    onClose();
  };

  // Очистка при открытии
  useEffect(() => {
    if (isOpen) {
      setHasSearched(false);
      setSelectedBooks(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="y2k-panel relative mx-4 w-full max-w-2xl overflow-hidden rounded-[14px] text-[#d8f9ff] animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-300/35 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-[10px] border border-cyan-300/45 bg-[rgba(7,13,30,0.82)]">
                <BookOpen className="h-4 w-4 text-cyan-100" />
              </div>
              <h2 className="text-lg font-semibold tracking-[0.05em] text-[#e8ffff]">
                Найти книгу
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-cyan-300/45 text-cyan-200/80 transition-colors hover:border-fuchsia-300/70 hover:text-fuchsia-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="border-b border-cyan-300/35 p-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-200/65" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите название книги или автора..."
                  className="w-full rounded-xl border border-cyan-300/45 bg-[rgba(6,12,28,0.88)] py-3 pl-10 pr-4 text-[#d8f9ff] placeholder:text-cyan-200/45 transition-colors focus:border-fuchsia-300/70 focus:outline-none"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isLoading || query.length < 2}
                className="y2k-btn-primary flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? <Spinner size="sm" /> : "Найти"}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto p-4">
            {/* Toolbar */}
            {results.length > 0 && (
              <div className="flex items-center justify-between mb-4 animate-fade-in">
                <span className="text-sm text-cyan-200/75">
                  Найдено: {totalResults}
                </span>
                {selectedBooks.size > 0 && (
                  <button
                    onClick={handleAddSelectedBooks}
                    className="y2k-btn-primary flex cursor-pointer items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold animate-scale-in"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить выбранные ({selectedBooks.size})
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
                      isSelected={selectedBooks.has(book.openLibraryKey)}
                      onToggle={() => toggleBookSelection(book.openLibraryKey)}
                      onView={() => setViewBook(book)}
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
                {results.length === 0 && !isLoading && hasSearched && (
                  <div className="py-12 text-center">
                    <BookOpen className="mx-auto mb-3 h-12 w-12 text-cyan-200/50" />
                    <p className="text-cyan-200/80">Ничего не найдено</p>
                    <p className="mt-1 text-sm text-cyan-200/55">
                      Проверьте правильность названия или попробуйте другой
                      запрос
                    </p>
                  </div>
                )}

                {/* Initial State */}
                {results.length === 0 && !isLoading && !hasSearched && (
                  <div className="py-12 text-center">
                    <Search className="mx-auto mb-3 h-12 w-12 text-cyan-200/50" />
                    <p className="text-cyan-200/80">
                      Введите название книги или автора
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-cyan-300/35 bg-[rgba(6,10,22,0.75)] p-4">
            <button
              onClick={handleClose}
              className="y2k-btn-ghost cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold"
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
