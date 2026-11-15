import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, User, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { apiAdminSearchSupportUsers } from "@/lib/supportApi";
import type { SupportUserSearchResultDto } from "../../../shared/types";

interface AdminNewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: SupportUserSearchResultDto) => void;
  isSubmitting?: boolean;
}

export function AdminNewChatModal({
  isOpen,
  onClose,
  onSelectUser,
  isSubmitting = false,
}: AdminNewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 250);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setSearchQuery("");
    onClose();
  }, [onClose]);

  const handleSelect = (user: SupportUserSearchResultDto) => {
    setSearchQuery("");
    onSelectUser(user);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, handleClose]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-support-users-search", debouncedQuery],
    queryFn: () => apiAdminSearchSupportUsers(debouncedQuery),
    enabled: isOpen && debouncedQuery.trim().length > 0,
    staleTime: 30_000,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-modal-title"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141418] p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h2 id="new-chat-modal-title" className="text-base font-semibold text-white">
            Новый диалог с пользователем
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Поле поиска */}
        <div className="relative mt-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по никнейму или email..."
            disabled={isSubmitting}
            className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-8 py-2.5 text-xs text-white placeholder-gray-500 focus:border-amber-300/50 focus:outline-none disabled:opacity-50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Результаты поиска */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-1.5 min-h-[180px] max-h-[300px] pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {searchQuery.trim().length === 0 && (
            <div className="py-12 text-center text-xs text-gray-500">
              Введите имя пользователя или email для поиска
            </div>
          )}

          {searchQuery.trim().length > 0 && isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
              <Loader2 size={18} className="animate-spin text-amber-300" />
              <span>Поиск пользователей...</span>
            </div>
          )}

          {searchQuery.trim().length > 0 && !isLoading && users.length === 0 && (
            <div className="py-12 text-center text-xs text-gray-500">
              Пользователи не найдены
            </div>
          )}

          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelect(u)}
              disabled={isSubmitting}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15 transition-all text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="size-8 rounded-full bg-amber-400/10 border border-amber-300/20 flex items-center justify-center text-amber-200 text-xs font-bold shrink-0 overflow-hidden">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="size-full object-cover" />
                ) : u.username ? (
                  u.username.charAt(0).toUpperCase()
                ) : (
                  <User size={14} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white group-hover:text-amber-200 truncate transition-colors">
                  {u.username || "Без имени"}
                </div>
                <div className="text-[11px] text-gray-400 truncate">
                  {u.email}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
