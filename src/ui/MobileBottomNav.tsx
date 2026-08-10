import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { List, Globe, Library, BarChart3, Star, ChevronDown, BookMarked } from "lucide-react";
import { useAuth } from "@/hooks/useAuthContext";
import { useBookshelf } from "@/hooks/useBookshelf";
import { useBottomSafeOffset } from "@/hooks/useBottomSafeOffset";

interface MobileBottomNavProps {
  showTemplatesNav?: boolean;
}

export function MobileBottomNav({ showTemplatesNav = true }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { totalCount } = useBookshelf();
  const bottomOffset = useBottomSafeOffset();
  const [ratingsOpen, setRatingsOpen] = useState(false);
  const ratingsRef = useRef<HTMLDivElement>(null);

  const closeRatings = useCallback(() => setRatingsOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRatings();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (ratingsRef.current && !ratingsRef.current.contains(e.target as Node)) {
        closeRatings();
      }
    };
    if (ratingsOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ratingsOpen, closeRatings]);

  const NAV_ITEMS = [
    { label: "Главная", icon: List, path: isAuthenticated ? "/dashboard" : "/" },
    { label: "Рейтинги", icon: BarChart3 },
    { label: "Тир-листы", icon: Library, path: "/templates" },
    { label: "Полка", icon: BookMarked, path: "/shelf", badge: totalCount },
    { label: "Новости", icon: Globe, path: "/community" },
  ] as const;

  const items = showTemplatesNav
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.label !== "Тир-листы");

  const isActive = (label: string) => {
    if (label === "Рейтинги") {
      return location.pathname === "/rankings" ||
        location.pathname === "/celebrities" ||
        location.pathname.startsWith("/celebrities/");
    }
    const item = NAV_ITEMS.find((i) => i.label === label);
    if (!item || !("path" in item) || !item.path) return false;
    return location.pathname === item.path ||
      (item.path !== "/" && item.path !== "/dashboard" && location.pathname.startsWith(item.path));
  };

  const handleRatingsSubNav = (path: string) => {
    navigate(path);
    setRatingsOpen(false);
  };

  return (
    <nav className="fixed left-0 right-0 z-50 md:hidden border-t border-white/[0.06] bg-black/85 backdrop-blur-2xl" style={{ bottom: bottomOffset }}>
      <div className="flex items-stretch h-14">
        {items.map((item) => {
          const active = isActive(item.label);
          const Icon = item.icon;
          const isRatings = item.label === "Рейтинги";

          return (
            <div
              key={item.label}
              ref={isRatings ? ratingsRef : undefined}
              className="relative flex-1"
            >
              <button
                data-analytics={`nav.mobile.${item.label.toLowerCase()}`}
                onClick={() => {
                  if (isRatings) {
                    setRatingsOpen((prev) => !prev);
                  } else if ("path" in item && item.path) {
                    navigate(item.path);
                  }
                }}
                className={`flex w-full flex-col items-center justify-center gap-0.5 transition-[transform,color] duration-100 ease-out cursor-pointer active:scale-[0.93] h-full ${
                  active
                    ? "text-cyan-400"
                    : "text-white/40 hover:text-white active:text-white"
                }`}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  <Icon size={20} />
                  {"badge" in item && item.badge != null && item.badge > 0 && (
                    <span className="absolute -right-2 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[9px] font-bold text-black">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                  {isRatings && (
                    <ChevronDown
                      size={10}
                      className={`absolute -right-3 top-0 transition-transform duration-200 ${
                        ratingsOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </span>
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>

              {/* Drop-up для «Рейтинги» */}
              {isRatings && ratingsOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-xl border border-slate-700/50 bg-[#0f1525]/95 backdrop-blur-xl shadow-2xl shadow-black/60 py-1.5 z-50">
                  <button
                    data-analytics="nav.mobile.ratings_books"
                    onClick={() => handleRatingsSubNav("/rankings")}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                      location.pathname === "/rankings"
                        ? "text-cyan-400 bg-slate-800/50"
                        : "text-gray-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <BarChart3 size={16} className="text-cyan-400 shrink-0" />
                    <span>Лучшие книги 2026</span>
                  </button>
                  <button
                    data-analytics="nav.mobile.ratings_celebrities"
                    onClick={() => handleRatingsSubNav("/celebrities")}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                      location.pathname === "/celebrities" || location.pathname.startsWith("/celebrities/")
                        ? "text-cyan-400 bg-slate-800/50"
                        : "text-gray-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <Star size={16} className="text-amber-400 shrink-0" />
                    <span>Топ знаменитостей</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
