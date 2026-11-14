import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchCatalogBooks, type CatalogBook } from "@/lib/bookApi";
import type { DnaBookItemData } from "@/lib/readingDnaApi";

export interface BookChipInputProps {
  books: (DnaBookItemData | null)[];
  kryptonite: DnaBookItemData | null;
  onChange: (
    books: (DnaBookItemData | null)[],
    kryptonite: DnaBookItemData | null
  ) => void;
  theme?: "dark" | "craft" | "light";
  className?: string;
}

export interface BookSlotMeta {
  slot: number;
  badge: string;
  role: string;
  desc: string;
  placeholder: string;
  isKryptonite?: boolean;
}

const BOOK_SLOTS: BookSlotMeta[] = [
  {
    slot: 1,
    badge: "1/4",
    role: "Главная святыня",
    desc: "Книга, которая сформировала ваш литературный вкус или перевернула сознание",
    placeholder: "Название книги (главная святыня)",
  },
  {
    slot: 2,
    badge: "2/4",
    role: "Любимый шедевр",
    desc: "Книга, к которой вы возвращаетесь и готовы перечитывать снова и снова",
    placeholder: "Название книги (любимый шедевр)",
  },
  {
    slot: 3,
    badge: "3/4",
    role: "Личное сокровище",
    desc: "Книга, которую вы горячо рекомендуете близким друзьям",
    placeholder: "Название книги (личное сокровище)",
  },
  {
    slot: 4,
    badge: "4/4",
    role: "Личный криптонит ☠",
    desc: "Книга, которую все превозносят, а вы бросили или терпеть не можете",
    placeholder: "Название книги (криптонит: не зашла / бросили)",
    isKryptonite: true,
  },
];

const DEBOUNCE_MS = 250;

export function BookChipInput({
  books,
  kryptonite,
  onChange,
  theme = "dark",
  className = "",
}: BookChipInputProps) {
  const isDark = theme === "dark";
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce для автокомплита
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  // Запрос в каталог BookStrata
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["catalog-search", "chip-input", debouncedQuery],
    queryFn: () => searchCatalogBooks(debouncedQuery, 5),
    enabled: isOpen && debouncedQuery.trim().length >= 2,
    staleTime: 60_000,
  });

  // Закрытие выпадающего списка при клике снаружи
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

  const handleAddBook = useCallback(
    (book: DnaBookItemData) => {
      if (!book.title.trim()) return;

      const currentBooks = books.filter((b): b is DnaBookItemData => Boolean(b));
      if (currentBooks.length < 3) {
        onChange([...currentBooks, book], kryptonite);
      } else if (!kryptonite) {
        // Все три святыни заняты — 4-я книга становится криптонитом
        onChange(currentBooks, book);
      }

      setInputValue("");
      setIsOpen(false);
    },
    [books, kryptonite, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (inputValue.trim()) {
          handleAddBook({ title: inputValue.trim() });
        }
      }
    },
    [inputValue, handleAddBook]
  );

  const handleSelectCatalogBook = useCallback(
    (catalogBook: CatalogBook) => {
      handleAddBook({
        title: catalogBook.title,
        author: catalogBook.author || undefined,
        bookId: catalogBook.id,
        coverImageUrl: catalogBook.coverImageUrl || undefined,
      });
    },
    [handleAddBook]
  );

  const handleRemoveFavorite = useCallback(
    (index: number) => {
      const currentBooks = books.filter((b): b is DnaBookItemData => Boolean(b));
      const next = currentBooks.filter((_, i) => i !== index);
      onChange(next, kryptonite);
    },
    [books, kryptonite, onChange]
  );

  const handleRemoveKryptonite = useCallback(() => {
    onChange(books.filter((b): b is DnaBookItemData => Boolean(b)), null);
  }, [books, onChange]);

  const currentBooks = books.filter((b): b is DnaBookItemData => Boolean(b));
  const isFull = currentBooks.length >= 3 && kryptonite !== null;
  const currentSlotNumber = currentBooks.length < 3 ? currentBooks.length + 1 : 4;
  const currentSlot = BOOK_SLOTS[currentSlotNumber - 1]!;

  return (
    <div ref={containerRef} className={`space-y-3 ${className}`}>
      {isFull ? (
        /* Итоговая плашка без дублирования, когда все 4 книги уже добавлены */
        <div
          className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            isDark
              ? "bg-[#24170f]/80 border-[rgba(201,163,91,0.35)] text-[#efe3cc]"
              : "bg-white border-[rgba(59,110,168,0.35)] text-[#2e2a24]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-sm">✓</span>
            <div>
              <span className="font-semibold">Все 4 книги выбраны</span>
              <span className="opacity-65 block text-[11px]">
                3 святыни + 1 криптонит (нажмите ✕ на книге ниже для замены)
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono opacity-70 px-2 py-0.5 rounded border border-current/20">
            4 из 4
          </span>
        </div>
      ) : (
        <>
          {/* Динамический заголовок перед вводом каждой книги */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-semibold inline-flex items-center gap-1.5 ${
                  currentSlot.isKryptonite
                    ? isDark
                      ? "text-rose-300"
                      : "text-rose-800"
                    : isDark
                      ? "text-[#c9a35b]"
                      : "text-[#3b6ea8]"
                }`}
              >
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-current/30 font-bold">
                  {currentSlot.badge}
                </span>
                <span className="text-sm font-bold">{currentSlot.role}</span>
              </span>
              <span className="text-[11px] opacity-60 font-mono">
                {currentSlotNumber} из 4
              </span>
            </div>
            <p className="text-xs opacity-75 leading-snug">
              {currentSlot.desc}
            </p>
          </div>

          {/* Поле ввода с автокомплитом */}
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setIsOpen(e.target.value.trim().length >= 2);
              }}
              onFocus={() => {
                if (inputValue.trim().length >= 2) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={currentSlot.placeholder}
              className={`w-full pl-4 py-2.5 rounded-xl text-sm border focus:outline-none transition-all ${
                inputValue.trim().length > 0 ? "pr-11" : "pr-4"
              } ${
                currentSlot.isKryptonite
                  ? isDark
                    ? "bg-[#24170f] border-rose-500/50 text-[#efe3cc] placeholder-rose-300/40 focus:border-rose-400"
                    : "bg-white border-rose-400/60 text-[#2e2a24] placeholder-rose-800/40 focus:border-rose-500"
                  : isDark
                    ? "bg-[#24170f] border-[rgba(201,163,91,0.35)] text-[#efe3cc] placeholder-[#a89678]/60 focus:border-[#c9a35b]"
                    : "bg-white border-[rgba(59,110,168,0.35)] text-[#2e2a24] placeholder-[#6f6553]/60 focus:border-[#3b6ea8]"
              }`}
            />

            {/* Лоадер при поиске в каталоге */}
            {isLoading && isOpen && (
              <div
                className={`absolute ${
                  inputValue.trim().length > 0 ? "right-11" : "right-3"
                } top-1/2 -translate-y-1/2 pointer-events-none`}
              >
                <Loader2
                  size={16}
                  className={`animate-spin ${
                    currentSlot.isKryptonite
                      ? "text-rose-400"
                      : isDark
                        ? "text-[#c9a35b]"
                        : "text-[#3b6ea8]"
                  }`}
                />
              </div>
            )}

            {/* Кнопка-стрелочка для явного подтверждения ввода */}
            {inputValue.trim().length > 0 && (
              <button
                type="button"
                onClick={() => handleAddBook({ title: inputValue.trim() })}
                aria-label="Подтвердить добавление книги"
                title="Подтвердить добавление книги"
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 z-10 ${
                  currentSlot.isKryptonite
                    ? "bg-[#8a2433] text-white hover:bg-[#a32b3d]"
                    : isDark
                      ? "bg-[#c9a35b] text-[#1a110c] hover:bg-[#dfb76c]"
                      : "bg-[#3b6ea8] text-white hover:bg-[#4d82c2]"
                }`}
              >
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            )}

            {/* Выпадающий список подсказок */}
            {isOpen && (
              <div
                className={`absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border shadow-xl max-h-60 overflow-y-auto py-1 text-xs backdrop-blur-md ${
                  isDark
                    ? "bg-[#2a1a10]/95 border-[#c9a35b]/40 text-[#efe3cc]"
                    : "bg-white/95 border-[#3b6ea8]/40 text-[#2e2a24]"
                }`}
              >
                {results.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider opacity-60 border-b border-current/10 flex items-center justify-between">
                      <span>Каталог BookStrata</span>
                      <Search size={10} />
                    </div>

                    {results.map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => handleSelectCatalogBook(book)}
                        className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isDark
                            ? "hover:bg-[#c9a35b]/20 focus:bg-[#c9a35b]/20"
                            : "hover:bg-[#3b6ea8]/10 focus:bg-[#3b6ea8]/10"
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
                            className={`w-6 h-8 rounded flex items-center justify-center text-xs shrink-0 border ${
                              isDark
                                ? "bg-[#1a110c] border-[#c9a35b]/30 text-[#c9a35b]"
                                : "bg-stone-100 border-stone-300 text-stone-700"
                            }`}
                          >
                            📖
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate text-xs">{book.title}</div>
                          {book.author && (
                            <div className="text-[10px] opacity-70 truncate">
                              {book.author}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Опция добавить введенное название как свою книгу */}
                {inputValue.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAddBook({ title: inputValue.trim() })}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors cursor-pointer ${
                      results.length > 0 ? "border-t border-current/10" : ""
                    } ${
                      currentSlot.isKryptonite
                        ? "hover:bg-rose-500/20 text-rose-300"
                        : isDark
                          ? "hover:bg-[#c9a35b]/20 text-[#c9a35b]"
                          : "hover:bg-[#3b6ea8]/10 text-[#3b6ea8]"
                    }`}
                  >
                    <ArrowRight size={13} className="shrink-0" />
                    <span className="truncate">
                      Добавить «<strong className="font-semibold">{inputValue.trim()}</strong>»
                    </span>
                    <span className="text-[10px] opacity-60 ml-auto shrink-0 font-normal">
                      {currentSlot.isKryptonite
                        ? "как криптонит"
                        : results.length === 0 && !isLoading
                          ? "своя книга"
                          : "свой вариант"}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Список выбранных книг (чипы с разными заголовками ролей) */}
      <div className="flex flex-wrap gap-2 pt-1">
        {currentBooks.map((book, idx) => {
          if (!book) return null;
          const meta = BOOK_SLOTS[idx] || BOOK_SLOTS[0]!;
          return (
            <span
              key={idx}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isDark
                  ? "bg-[#c9a35b] text-[#1a110c] font-semibold"
                  : "bg-[#3b6ea8] text-white"
              }`}
            >
              <span className="opacity-80 text-[10px] font-mono tracking-tight mr-0.5">
                {meta.role}:
              </span>
              <span>{book.title}</span>
              <button
                type="button"
                onClick={() => handleRemoveFavorite(idx)}
                className="hover:opacity-75 cursor-pointer ml-1 text-sm leading-none"
                aria-label={`Удалить ${book.title} ✕`}
              >
                ✕
              </button>
            </span>
          );
        })}

        {/* Чип криптонита (4-я книга) */}
        {kryptonite && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isDark
                ? "bg-[#8a2433] text-white border-rose-400/50"
                : "bg-[#b3412f] text-white border-rose-300"
            }`}
          >
            <span className="opacity-90 text-[10px] font-mono tracking-tight mr-0.5">
              Криптонит ☠:
            </span>
            <span>{kryptonite.title}</span>
            <button
              type="button"
              onClick={handleRemoveKryptonite}
              className="hover:opacity-75 cursor-pointer ml-1 text-sm leading-none"
              aria-label={`Удалить ${kryptonite.title} ✕`}
            >
              ✕
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
