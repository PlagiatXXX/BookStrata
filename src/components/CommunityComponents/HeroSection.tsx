import { Search as SearchIcon, X, Loader2, User } from "lucide-react";
import { useRef, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiSearchUsers, type UserSearchResult } from "@/lib/userApi";
import { Avatar } from "@/components/Avatar";
import { useDebounce } from "@/hooks/useDebounce";
import BookScene from "./BookScene/BookScene";
import { Reveal } from "@/components/Reveal/Reveal";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export const HeroSection = memo(() => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS);

  const {
    data: results = [],
    isLoading,
    isFetching,
  } = useQuery<UserSearchResult[]>({
    queryKey: ["userSearch", "community", debouncedQuery],
    queryFn: () => apiSearchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  });

  const showResults = query.trim().length >= MIN_QUERY_LENGTH;

  const handleUserClick = (userId: number) => {
    navigate(`/users/${userId}`);
  };

  return (
    <Reveal className="relative py-14 md:py-18">
      <section ref={containerRef}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12">
        {/* Left Content */}
        <div className="flex-1">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-1)">
            Редакционные статьи сообщества
          </p>
          <h1 className="community-heading mb-8 max-w-4xl text-3xl font-extrabold leading-[0.95] sm:text-5xl md:text-7xl">
            Найдите свой следующий
            <span className="block text-(--accent-main)">
              книжный тир-лист
            </span>
          </h1>

          <div className="max-w-3xl">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="brutal-card brutal-border p-2"
              role="search"
            >
              <div className="relative flex-1 flex items-center">
                <label htmlFor="community-search" className="sr-only">
                  Поиск пользователей по нику
                </label>
                <SearchIcon
                  className="absolute left-4 text-(--ink-1)"
                  size={20}
                />
                <input
                  id="community-search"
                  className="w-full bg-transparent border-none rounded-sm py-4 pl-12 pr-10 text-base text-(--ink-0) placeholder:text-(--ink-1) focus:outline-none"
                  placeholder="Поиск читателя по нику..."
                  type="text"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 text-(--ink-1) hover:text-(--ink-0) transition-colors cursor-pointer p-1"
                    aria-label="Очистить поиск"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </form>

            {/* Результаты поиска — живой список под hero */}
            {!showResults ? (
              <p className="mt-4 text-xs text-(--ink-1) opacity-70">
                Введите минимум {MIN_QUERY_LENGTH} символа, чтобы найти читателя
              </p>
            ) : isLoading || isFetching ? (
              <div className="flex items-center justify-center py-12 mt-2">
                <Loader2 className="w-7 h-7 text-(--accent-main) animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 mt-2 text-(--ink-1) text-center">
                <User size={40} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">Ничего не найдено</p>
                <p className="text-xs mt-1 opacity-60">
                  Попробуйте изменить запрос
                </p>
              </div>
            ) : (
              <div className="grid gap-3 mt-4">
                {results.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user.id)}
                    className="flex items-center gap-4 w-full p-4 brutal-card brutal-border hover-lift text-left cursor-pointer group"
                  >
                    <Avatar
                      url={user.avatarUrl}
                      username={user.username}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-(--ink-0) truncate group-hover:text-(--accent-main) transition-colors">
                          {user.username}
                        </span>
                        {user.isDonor && (
                          <span
                            className="text-xs text-yellow-400"
                            title="Меценат"
                          >
                            🕊️
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {user.title && (
                          <span className="text-xs text-(--ink-1)">
                            {user.title}
                          </span>
                        )}
                        {user.role && user.role !== "user" && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-(--accent-main) opacity-80">
                            {user.role}
                          </span>
                        )}
                        <span className="text-xs text-(--ink-2)">
                          {user.xp} XP
                        </span>
                      </div>
                    </div>
                    <div className="text-(--ink-2) group-hover:text-(--accent-main) transition-colors shrink-0">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Content - CSS 3D Book */}
        <div className="hidden lg:flex items-center justify-center shrink-0">
          <BookScene containerRef={containerRef} />
        </div>
      </div>
      </section>
    </Reveal>
  );
});