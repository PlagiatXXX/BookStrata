import { useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Star, Loader2 } from "lucide-react";
import { useCatalogSearch } from "@/hooks/useCatalogSearch";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder/BookCoverPlaceholder";
import { RetryableImage } from "@/ui/RetryableImage";

export function RankingsSearchBar() {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
  } = useCatalogSearch();

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Закрытие при клике вне
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  // Закрытие по Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, setIsOpen]);

  const handleSelect = useCallback(
    (slug: string | null) => {
      if (slug) {
        navigate(`/books/${slug}`);
        setIsOpen(false);
        setQuery("");
      }
    },
    [navigate, setIsOpen, setQuery],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(Math.min(activeIndex + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(Math.max(activeIndex - 1, -1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(results[activeIndex].slug);
      }
    },
    [isOpen, results, activeIndex, setActiveIndex, handleSelect],
  );

  // Скролл активного элемента в видимую область
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const showDropdown = isOpen && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Поисковая строка */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(0,219,233,0.15)] transition-all focus-within:ring-2 focus-within:ring-cyan-500/50 focus-within:border-cyan-500/60 focus-within:shadow-[0_0_20px_rgba(0,219,233,0.3)]">
        <Search size={18} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Найти книгу..."
          aria-label="Поиск книг в каталоге"
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 outline-none"
        />
        {isLoading && (
          <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" />
        )}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Очистить поиск"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-[400px] overflow-y-auto rounded-xl bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 shadow-xl animate-fade-in">
          {isLoading && results.length === 0 && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-12 w-8 rounded bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-slate-700" />
                    <div className="h-3 w-1/2 rounded bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400">Ничего не найдено</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ul ref={listRef} role="listbox" className="py-1">
              {results.map((book, index) => (
                <li
                  key={book.id}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => handleSelect(book.slug)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    index === activeIndex
                      ? "bg-cyan-500/10 text-white"
                      : "text-gray-300 hover:bg-slate-700/50"
                  }`}
                >
                  {/* Обложка */}
                  <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-slate-700">
                    {book.coverImageUrl ? (
                      <RetryableImage
                        src={book.coverImageUrl}
                        alt={book.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <BookCoverPlaceholder compact />
                    )}
                  </div>

                  {/* Инфо */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{book.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {book.author || "Автор неизвестен"}
                    </p>
                  </div>

                  {/* Рейтинг */}
                  {book.rating != null && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-medium text-amber-400">
                        {book.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
