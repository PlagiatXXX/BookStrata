import { Search as SearchIcon, X } from "lucide-react";
import { useRef, memo, useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import BookScene from "./BookScene/BookScene";

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

/**
 * HeroSection с оптимизированным поиском.
 * Использует локальное состояние для мгновенного отклика и дебаунс для обновления родителя,
 * что предотвращает лишние ререндеры тяжелых компонентов страницы на каждый символ.
 */
export const HeroSection = memo(({
  searchQuery,
  setSearchQuery,
}: HeroSectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debouncedQuery = useDebounce(localQuery, 300);

  // Синхронизируем дебаунснутое значение с родителем
  useEffect(() => {
    if (debouncedQuery !== searchQuery) {
      setSearchQuery(debouncedQuery);
    }
  }, [debouncedQuery, searchQuery, setSearchQuery]);

  // Синхронизируем локальное состояние, если поиск очищен снаружи
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  return (
    <section ref={containerRef} className="py-14 md:py-18 reveal" data-reveal>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12">
        {/* Left Content */}
        <div className="flex-1">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-1)">
            Редакционные статьи сообщества
          </p>
          <h1 className="community-heading mb-8 max-w-4xl text-3xl font-extrabold leading-[0.95] sm:text-5xl md:text-7xl">
            Найдите свой следующий
            <span className="block text-(--accent-main)">книжный тир-лист</span>
          </h1>

          <div className="max-w-3xl">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 brutal-card brutal-border p-2"
            >
              <div className="relative flex-1 flex items-center">
                <label htmlFor="community-search" className="sr-only">
                  Поиск вдохновения по названию или категории
                </label>
                <SearchIcon
                  className="absolute left-4 text-(--ink-1)"
                  size={20}
                />
                <input
                  id="community-search"
                  className="w-full bg-transparent border-none rounded-sm py-4 pl-12 pr-10 text-base text-(--ink-0) placeholder:text-(--ink-1) focus:outline-none"
                  placeholder="Поиск вдохновения..."
                  type="text"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  autoFocus
                />

                {localQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalQuery("");
                      setSearchQuery("");
                    }}
                    className="absolute right-2 text-(--ink-1) hover:text-(--ink-0) transition-colors cursor-pointer p-1"
                    aria-label="Очистить поиск"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto sm:ml-2 brutal-cta px-8 py-3 text-xs font-semibold uppercase tracking-widest cursor-pointer whitespace-nowrap"
              >
                Поиск
              </button>
            </form>
          </div>
        </div>

        {/* Right Content - CSS 3D Book */}
        <div className="hidden lg:flex items-center justify-center shrink-0">
          <BookScene containerRef={containerRef} />
        </div>
      </div>
    </section>
  );
});
