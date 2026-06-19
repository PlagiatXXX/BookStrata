import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Loader2, User, X } from "lucide-react";
import { apiSearchUsers, type UserSearchResult } from "@/lib/userApi";
import { Avatar } from "@/components/Avatar";

export function UserSearchSection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    data: results = [],
    isLoading,
    isFetching,
  } = useQuery<UserSearchResult[]>({
    queryKey: ["userSearch", query],
    queryFn: () => apiSearchUsers(query),
    enabled: query.trim().length >= 1,
    staleTime: 30_000,
  });

  // Фокус на поле ввода при монтировании
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleUserClick = (userId: number) => {
    navigate(`/users/${userId}`);
  };

  return (
    <div data-reveal className="user-search-section">
      {/* Заголовок */}
      <div className="flex items-center gap-2 mb-6">
        <Users size={20} className="text-(--accent-main)" />
        <h2 className="text-lg font-bold uppercase tracking-wider text-(--ink-0)">
          Поиск пользователей
        </h2>
      </div>

      {/* Поле поиска */}
      <div className="relative mb-8">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-(--bg-2) border border-(--line-soft) transition-all focus-within:border-(--accent-main) focus-within:ring-1 focus-within:ring-(--accent-main)/30">
          <Search size={18} className="text-(--ink-1) shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите ник пользователя..."
            aria-label="Поиск пользователей по нику"
            className="flex-1 bg-transparent text-sm text-(--ink-0) outline-none placeholder:text-(--ink-2)"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md hover:bg-(--bg-1) text-(--ink-2) hover:text-(--ink-0) transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Результаты */}
      {query.trim().length >= 1 && (
        <div className="user-search-results">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-(--accent-main) animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-(--ink-1) text-center">
              <User size={48} className="mb-4 opacity-40" />
              <p className="text-sm font-medium">Ничего не найдено</p>
              <p className="text-xs mt-1 opacity-60">Попробуйте изменить запрос</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className="flex items-center gap-4 w-full p-4 rounded-xl bg-(--bg-2) border border-(--line-soft) hover:border-(--accent-main)/40 hover:bg-(--bg-1) transition-all text-left cursor-pointer group"
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
                        <span className="text-xs text-yellow-400" title="Меценат">🕊️</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {user.title && (
                        <span className="text-xs text-(--ink-1)">{user.title}</span>
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Пустое состояние — не вводили запрос */}
      {query.trim().length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-(--ink-1) text-center">
          <Search size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Начните вводить ник для поиска</p>
          <p className="text-xs mt-1 opacity-60">
            Например: «username» или часть ника
          </p>
        </div>
      )}
    </div>
  );
}
