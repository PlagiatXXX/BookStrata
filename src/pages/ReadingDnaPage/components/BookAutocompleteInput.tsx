import { useState, useRef, useEffect, useCallback } from "react";
import { BookOpen, X, Check, Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchCatalogBooks, type CatalogBook } from "@/lib/bookApi";
import type { DnaBookItemData } from "@/lib/readingDnaApi";

export interface BookAutocompleteInputProps {
  value: DnaBookItemData;
  onChange: (value: DnaBookItemData) => void;
  placeholderTitle?: string;
  theme?: "dark" | "craft";
  className?: string;
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 250;

export function BookAutocompleteInput({
  value,
  onChange,
  placeholderTitle = "Название книги *",
  theme = "dark",
  className = "",
  autoFocus = false,
}: BookAutocompleteInputProps) {
  const isDark = theme === "dark";
  const query = value.title || "";
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce для запроса к API
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Поиск по каталогу BookStrata
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["catalog-search", "dna-autocomplete", debouncedQuery],
    queryFn: () => searchCatalogBooks(debouncedQuery, 6),
    enabled: isOpen && debouncedQuery.trim().length >= 2,
    staleTime: 60_000,
  });

  // Закрытие при клике вне компонента
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setIsOpen(newTitle.trim().length >= 2);
      onChange({
        ...value,
        title: newTitle,
        // Если пользователь начал стирать или менять название, сбрасываем привязку к каталогу
        bookId: undefined,
        coverImageUrl: undefined,
      });
    },
    [value, onChange]
  );

  const handleAuthorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...value,
        author: e.target.value,
      });
    },
    [value, onChange]
  );

  const handleSelectBook = useCallback(
    (book: CatalogBook) => {
      setIsOpen(false);
      onChange({
        title: book.title,
        author: book.author || undefined,
        bookId: book.id,
        coverImageUrl: book.coverImageUrl || undefined,
      });
    },
    [onChange]
  );

  const handleClearCatalogBinding = useCallback(() => {
    onChange({
      ...value,
      bookId: undefined,
      coverImageUrl: undefined,
    });
  }, [value, onChange]);

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Инпут Названия с автокомплитом */}
        <div className="relative">
          <div className="relative flex items-center">
            {value.coverImageUrl ? (
              <div className="absolute left-2 shrink-0 w-5 h-7 rounded overflow-hidden border border-amber-500/40 shadow-xs z-10">
                <img
                  src={value.coverImageUrl}
                  alt={value.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <BookOpen
                size={14}
                className={`absolute left-3 pointer-events-none opacity-40 ${
                  isDark ? "text-amber-400" : "text-stone-600"
                }`}
              />
            )}

            <input
              type="text"
              value={query}
              onChange={handleTitleChange}
              onFocus={() => {
                if (query.trim().length >= 2) setIsOpen(true);
              }}
              placeholder={placeholderTitle}
              autoFocus={autoFocus}
              className={`w-full py-1.5 text-xs sm:text-sm rounded-lg border focus:outline-none transition-all ${
                value.coverImageUrl ? "pl-9 pr-7" : "pl-8 pr-7"
              } ${
                isDark
                  ? "bg-slate-900/60 border-slate-700/80 text-slate-100 placeholder-slate-500 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40"
                  : "bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
              }`}
            />

            {/* Иконка статуса / сброса */}
            <div className="absolute right-2 flex items-center gap-1">
              {isLoading && isOpen && (
                <Loader2
                  size={12}
                  className="animate-spin text-amber-400 opacity-70"
                />
              )}
              {value.coverImageUrl && (
                <button
                  type="button"
                  onClick={handleClearCatalogBinding}
                  title="Отвязать обложку каталога"
                  className="text-amber-400 hover:text-amber-300 cursor-pointer p-0.5 rounded"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Выпадающий список подсказок из каталога BookStrata */}
          {isOpen && (
            <div
              className={`absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border shadow-xl max-h-56 overflow-y-auto py-1 text-xs backdrop-blur-md ${
                isDark
                  ? "bg-[#141b2a]/95 border-amber-500/30 text-slate-200"
                  : "bg-[#fffdf7]/95 border-stone-300 text-stone-800"
              }`}
            >
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-amber-400/80 border-b border-current/10 flex items-center justify-between">
                <span>Каталог BookStrata</span>
                <Search size={10} />
              </div>

              {isLoading && results.length === 0 ? (
                <div className="p-3 text-center text-slate-400 flex items-center justify-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Поиск в архиве...</span>
                </div>
              ) : results.length > 0 ? (
                results.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => handleSelectBook(book)}
                    className={`w-full px-2.5 py-1.5 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isDark
                        ? "hover:bg-amber-500/15 focus:bg-amber-500/15"
                        : "hover:bg-amber-100/70 focus:bg-amber-100/70"
                    }`}
                  >
                    {book.coverImageUrl ? (
                      <img
                        src={book.coverImageUrl}
                        alt={book.title}
                        className="w-6 h-8 object-cover rounded shadow-xs shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-6 h-8 rounded flex items-center justify-center text-[10px] shrink-0 border ${
                          isDark
                            ? "bg-slate-800 border-slate-700 text-amber-300"
                            : "bg-stone-200 border-stone-300 text-stone-600"
                        }`}
                      >
                        📖
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-[11px] sm:text-xs text-amber-300/90">
                        {book.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {book.author}
                      </div>
                    </div>
                    {value.bookId === book.id && (
                      <Check size={12} className="text-amber-400 shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-2.5 text-center text-slate-400 text-[11px]">
                  <span>Книга не найдена в каталоге.</span>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    Будет сохранено ваше собственное название.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Инпут Автора (необязательно) */}
        <div>
          <input
            type="text"
            value={value.author || ""}
            onChange={handleAuthorChange}
            placeholder="Автор (необязательно)"
            className={`w-full py-1.5 px-3 text-xs sm:text-sm rounded-lg border focus:outline-none transition-all ${
              isDark
                ? "bg-slate-900/60 border-slate-700/80 text-slate-100 placeholder-slate-500 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40"
                : "bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
