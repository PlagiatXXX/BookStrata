import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Loader2, ArrowRight, Globe, X } from "lucide-react";
import { useBookSearch } from "@/hooks/useBookSearch";
import { searchCatalogBooks } from "@/lib/bookApi";
import type { OpenLibraryBook } from "@/lib/bookSearchApi";
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

function parseTitleAndAuthor(raw: string): { title: string; author?: string } {
  const cleaned = raw.trim();
  const match = cleaned.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (match && match[1]?.trim() && match[2]?.trim()) {
    return {
      title: match[1].trim().replace(/^["«']|["»']$/g, ""),
      author: match[2].trim().replace(/^["«']|["»']$/g, ""),
    };
  }
  return { title: cleaned };
}

const BOOK_SLOTS: BookSlotMeta[] = [
  {
    slot: 1,
    badge: "1/4",
    role: "Главная святыня",
    desc: "Книга, которая сформировала ваш литературный вкус или перевернула сознание",
    placeholder: "Название книги или «Название — Автор» (главная святыня)",
  },
  {
    slot: 2,
    badge: "2/4",
    role: "Любимый шедевр",
    desc: "Книга, к которой вы возвращаетесь и готовы перечитывать снова и снова",
    placeholder: "Название книги или «Название — Автор» (любимый шедевр)",
  },
  {
    slot: 3,
    badge: "3/4",
    role: "Личное сокровище",
    desc: "Книга, которую вы горячо рекомендуете близким друзьям",
    placeholder: "Название книги или «Название — Автор» (личное сокровище)",
  },
  {
    slot: 4,
    badge: "4/4",
    role: "Личный криптонит ☠",
    desc: "Книга, которую все превозносят, а вы бросили или терпеть не можете",
    placeholder: "Название книги или «Название — Автор» (криптонит)",
    isKryptonite: true,
  },
];

const QUICK_POPULAR_BOOKS: DnaBookItemData[] = [
  { title: "Мастер и Маргарита", author: "Михаил Булгаков" },
  { title: "1984", author: "Джордж Оруэлл" },
  { title: "Преступление и наказание", author: "Фёдор Достоевский" },
  { title: "Дюна", author: "Фрэнк Герберт" },
  { title: "Гарри Поттер и философский камень", author: "Дж. К. Роулинг" },
  { title: "Маленький принц", author: "Антуан де Сент-Экзюпери" },
  { title: "Три товарища", author: "Эрих Мария Ремарк" },
  { title: "Цветы для Элджернона", author: "Дэниел Киз" },
  { title: "Властелин колец", author: "Дж. Р. Р. Толкин" },
  { title: "Портрет Дориана Грея", author: "Оскар Уайльд" },
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
  const [manualAuthor, setManualAuthor] = useState("");
  const [isManualAuthorOpen, setIsManualAuthorOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingQuickTitle, setLoadingQuickTitle] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Единый параллельный поиск через канонический хук с кэшированием в localStorage
  const {
    search,
    results: searchResults,
    isLoading,
    clearResults,
  } = useBookSearch({ cacheEnabled: true, requireCover: false });

  const lastSearchedRef = useRef("");

  // Debounce для автокомплита
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = inputValue.trim();
      if (trimmed.length >= 2 && isOpen) {
        lastSearchedRef.current = trimmed;
        search(trimmed);
      } else if (trimmed.length < 2) {
        clearResults();
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, isOpen, search, clearResults]);

  const catalogResults = useMemo(
    () => searchResults.filter((b) => b.source === "bookstrata"),
    [searchResults]
  );

  const worldResults = useMemo(
    () => searchResults.filter((b) => b.source !== "bookstrata"),
    [searchResults]
  );

  // Закрытие выпадающего списка при клике снаружи
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsManualAuthorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddBook = useCallback(
    (book: DnaBookItemData) => {
      const cleanTitle = book.title.trim();
      if (!cleanTitle) return;

      const currentBooks = books.filter((b): b is DnaBookItemData => Boolean(b));
      const normTitle = cleanTitle.toLowerCase().replace(/\s+/g, " ");
      const existingAll = [...currentBooks, ...(kryptonite ? [kryptonite] : [])];
      const isDuplicate = existingAll.some((item) => {
        if (book.bookId && item.bookId && item.bookId === book.bookId) return true;
        return item.title.trim().toLowerCase().replace(/\s+/g, " ") === normTitle;
      });

      if (isDuplicate) {
        setDuplicateError(`Книга «${cleanTitle}» уже добавлена в билет`);
        return;
      }

      setDuplicateError(null);
      if (currentBooks.length < 3) {
        onChange([...currentBooks, { ...book, title: cleanTitle }], kryptonite);
      } else if (!kryptonite) {
        // Все три святыни заняты — 4-я книга становится криптонитом
        onChange(currentBooks, { ...book, title: cleanTitle });
      }

      setInputValue("");
      setManualAuthor("");
      setIsManualAuthorOpen(false);
      setIsOpen(false);
      clearResults();
    },
    [books, kryptonite, onChange, clearResults]
  );

  const handleSelectBook = useCallback(
    (book: OpenLibraryBook) => {
      handleAddBook({
        title: book.title,
        author: book.author || undefined,
        bookId:
          book.source === "bookstrata" && book.externalId
            ? Number(book.externalId)
            : undefined,
        coverImageUrl: book.coverUrlLarge || book.coverUrl || undefined,
      });
    },
    [handleAddBook]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed) return;

        // Если выпадающий список открыт и есть результаты — выбираем первый результат
        if (isOpen && searchResults.length > 0) {
          handleSelectBook(searchResults[0]);
          return;
        }

        const parsed = parseTitleAndAuthor(trimmed);
        handleAddBook(parsed);
      }
    },
    [inputValue, isOpen, searchResults, handleSelectBook, handleAddBook]
  );

  const handleSelectQuickBook = useCallback(
    async (book: DnaBookItemData) => {
      if (loadingQuickTitle) return;
      setLoadingQuickTitle(book.title);
      try {
        const matches = await searchCatalogBooks(book.title, 5);
        const targetTitle = book.title.trim().toLowerCase();
        const exactMatch =
          matches.find(
            (m) => m.title.trim().toLowerCase() === targetTitle && Boolean(m.coverImageUrl)
          ) ||
          matches.find((m) => m.title.trim().toLowerCase() === targetTitle) ||
          matches.find(
            (m) =>
              m.title.trim().toLowerCase().includes(targetTitle) && Boolean(m.coverImageUrl)
          ) ||
          matches.find((m) => Boolean(m.coverImageUrl)) ||
          matches[0];

        if (exactMatch) {
          handleAddBook({
            title: exactMatch.title,
            author: exactMatch.author || book.author,
            bookId: exactMatch.id,
            coverImageUrl: exactMatch.coverImageUrl || undefined,
          });
          return;
        }
      } catch {
        // Fallback: добавляем книгу без данных каталога
      } finally {
        setLoadingQuickTitle(null);
      }
      handleAddBook(book);
    },
    [handleAddBook, loadingQuickTitle]
  );

  const handleRemoveFavorite = useCallback(
    (index: number) => {
      setDuplicateError(null);
      const currentBooks = books.filter((b): b is DnaBookItemData => Boolean(b));
      const next = currentBooks.filter((_, i) => i !== index);
      onChange(next, kryptonite);
    },
    [books, kryptonite, onChange]
  );

  const handleRemoveKryptonite = useCallback(() => {
    setDuplicateError(null);
    onChange(books.filter((b): b is DnaBookItemData => Boolean(b)), null);
  }, [books, onChange]);

  const currentBooks = books.filter((b): b is DnaBookItemData => Boolean(b));
  const isFull = currentBooks.length >= 3 && kryptonite !== null;
  const currentSlotNumber = currentBooks.length < 3 ? currentBooks.length + 1 : 4;
  const currentSlot = BOOK_SLOTS[currentSlotNumber - 1]!;

  const selectedTitles = new Set(
    [
      ...currentBooks.map((b) => b.title.trim().toLowerCase()),
      ...(kryptonite ? [kryptonite.title.trim().toLowerCase()] : []),
    ]
  );
  const availableQuickBooks = QUICK_POPULAR_BOOKS.filter(
    (b) => !selectedTitles.has(b.title.trim().toLowerCase())
  );

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
                setDuplicateError(null);
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
                onClick={() => {
                  if (searchResults.length > 0) {
                    handleSelectBook(searchResults[0]);
                  } else {
                    const parsed = parseTitleAndAuthor(inputValue);
                    handleAddBook(parsed);
                  }
                }}
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
                className={`absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border shadow-xl max-h-72 overflow-y-auto py-1 text-xs backdrop-blur-md ${
                  isDark
                    ? "bg-[#2a1a10]/95 border-[#c9a35b]/40 text-[#efe3cc]"
                    : "bg-white/95 border-[#3b6ea8]/40 text-[#2e2a24]"
                }`}
              >
                {/* 1. Секция каталога BookStrata */}
                {catalogResults.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider opacity-60 border-b border-current/10 flex items-center justify-between">
                      <span>Каталог BookStrata</span>
                      <Search size={10} />
                    </div>

                    {catalogResults.map((book) => (
                      <button
                        key={book.openLibraryKey || book.title}
                        type="button"
                        onClick={() => handleSelectBook(book)}
                        className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isDark
                            ? "hover:bg-[#c9a35b]/20 focus:bg-[#c9a35b]/20"
                            : "hover:bg-[#3b6ea8]/10 focus:bg-[#3b6ea8]/10"
                        }`}
                      >
                        {book.coverUrlLarge || book.coverUrl ? (
                          <img
                            src={book.coverUrlLarge || book.coverUrl || ""}
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

                {/* Индикатор загрузки поиска */}
                {isLoading && (
                  <div className="px-3 py-2 text-[11px] opacity-65 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Ищем в каталоге и мировой библиотеке...</span>
                  </div>
                )}

                {/* 2. Секция Google Books */}
                {worldResults.length > 0 && (
                  <>
                    <div
                      className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider opacity-60 flex items-center justify-between ${
                        catalogResults.length > 0 ? "border-t border-current/10" : "border-b border-current/10"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Globe size={11} className={isDark ? "text-[#f4d03f]" : "text-[#3b6ea8]"} />
                        <span>Мировая библиотека (Google Books)</span>
                      </span>
                      <span className="text-[9px] opacity-60 font-mono">мировая база</span>
                    </div>

                    {worldResults.map((gb, idx) => (
                      <button
                        key={`${gb.openLibraryKey || gb.title}-${idx}`}
                        type="button"
                        onClick={() => handleSelectBook(gb)}
                        className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isDark
                            ? "hover:bg-[#c9a35b]/20 focus:bg-[#c9a35b]/20"
                            : "hover:bg-[#3b6ea8]/10 focus:bg-[#3b6ea8]/10"
                        }`}
                      >
                        {gb.coverUrlLarge || gb.coverUrl ? (
                          <img
                            src={gb.coverUrlLarge || gb.coverUrl || ""}
                            alt={gb.title}
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
                            🌍
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate text-xs">{gb.title}</div>
                          <div className="text-[10px] opacity-70 truncate flex items-center gap-1.5">
                            {gb.author && <span>{gb.author}</span>}
                            {gb.publishYear && <span>· {gb.publishYear}</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* 3. Секция ручного ввода со своей книгой и автором */}
                {inputValue.trim().length > 0 && (
                  <div
                    className={`p-2 transition-colors ${
                      catalogResults.length > 0 || worldResults.length > 0
                        ? "border-t border-current/10"
                        : ""
                    }`}
                  >
                    {!isManualAuthorOpen ? (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const parsed = parseTitleAndAuthor(inputValue);
                            handleAddBook(parsed);
                          }}
                          className={`grow px-2 py-1.5 text-left flex items-center gap-2 rounded-lg transition-colors cursor-pointer ${
                            currentSlot.isKryptonite
                              ? "hover:bg-rose-500/20 text-rose-300"
                              : isDark
                                ? "hover:bg-[#c9a35b]/20 text-[#c9a35b]"
                                : "hover:bg-[#3b6ea8]/10 text-[#3b6ea8]"
                          }`}
                        >
                          <ArrowRight size={13} className="shrink-0" />
                          <span className="truncate">
                            Добавить «
                            <strong className="font-semibold">
                              {parseTitleAndAuthor(inputValue).title}
                            </strong>
                            »
                            {parseTitleAndAuthor(inputValue).author && (
                              <span className="opacity-75 italic text-[11px] ml-1">
                                ({parseTitleAndAuthor(inputValue).author})
                              </span>
                            )}
                          </span>
                        </button>

                        {!parseTitleAndAuthor(inputValue).author && (
                          <button
                            type="button"
                            onClick={() => {
                              setManualAuthor("");
                              setIsManualAuthorOpen(true);
                            }}
                            className={`shrink-0 px-2.5 py-1 text-[11px] rounded-md border font-medium cursor-pointer transition-all ${
                              isDark
                                ? "border-[rgba(201,163,91,0.35)] hover:bg-[#c9a35b]/15 text-[#efe3cc]"
                                : "border-[rgba(59,110,168,0.35)] hover:bg-[#3b6ea8]/10 text-[#2e2a24]"
                            }`}
                          >
                            + Указать автора
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5 p-2 rounded-lg border bg-black/15 border-current/15">
                        <div className="text-[11px] font-semibold flex items-center justify-between">
                          <span className="truncate">
                            Книга: <strong>«{inputValue.trim()}»</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsManualAuthorOpen(false)}
                            className="opacity-60 hover:opacity-100 p-0.5 cursor-pointer"
                            aria-label="Закрыть поле автора"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Автор (например: Михаил Булгаков)"
                            value={manualAuthor}
                            onChange={(e) => setManualAuthor(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddBook({
                                  title: inputValue.trim(),
                                  author: manualAuthor.trim() || undefined,
                                });
                              }
                            }}
                            className={`grow px-2.5 py-1 text-xs rounded-md border bg-black/10 border-current/20 focus:outline-none ${
                              isDark ? "text-[#efe3cc]" : "text-[#2e2a24]"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleAddBook({
                                title: inputValue.trim(),
                                author: manualAuthor.trim() || undefined,
                              });
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-md text-white cursor-pointer transition-all ${
                              currentSlot.isKryptonite
                                ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                                : isDark
                                  ? "bg-[#c9a35b] text-[#1a110c] hover:bg-[#dfb76c]"
                                  : "bg-[#3b6ea8] hover:bg-[#4d82c2]"
                            }`}
                          >
                            Добавить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Сообщение об ошибке дубликата */}
          {duplicateError && (
            <p className="text-xs text-rose-400 font-medium" role="alert">
              {duplicateError}
            </p>
          )}

          {/* Быстрые популярные книги-подсказки в 1 клик */}
          {availableQuickBooks.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <span className="block text-[11px] opacity-65">
                Быстрый выбор в 1 клик:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableQuickBooks.map((book) => {
                  const isBusy = loadingQuickTitle === book.title;
                  return (
                    <button
                      key={book.title}
                      type="button"
                      disabled={Boolean(loadingQuickTitle)}
                      onClick={() => handleSelectQuickBook(book)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
                        currentSlot.isKryptonite
                          ? isDark
                            ? "border-rose-500/35 bg-rose-950/25 text-rose-200/90 hover:bg-rose-500/20"
                            : "border-rose-300 bg-rose-50/70 text-rose-900 hover:bg-rose-100"
                          : isDark
                            ? "border-[rgba(201,163,91,0.3)] bg-[#24170f]/70 text-[#efe3cc]/90 hover:bg-[#c9a35b]/20"
                            : "border-[rgba(59,110,168,0.3)] bg-white/80 text-[#2e2a24] hover:bg-[#3b6ea8]/10"
                      }`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          <span>{book.title}</span>
                        </>
                      ) : (
                        `+ ${book.title}`
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
              {book.author && (
                <span className="opacity-75 text-[10px] font-normal italic truncate max-w-[140px]">
                  ({book.author})
                </span>
              )}
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
            {kryptonite.author && (
              <span className="opacity-80 text-[10px] font-normal italic truncate max-w-[140px]">
                ({kryptonite.author})
              </span>
            )}
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
