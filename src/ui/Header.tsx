import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { Logo } from "./Logo";
import { Avatar } from "@/components/Avatar";
import {
  List,
  Library,
  Globe,
  LogOut,
  BarChart3,
  Star,
  ChevronDown,
  Pause,
  Play,
  BookMarked,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAmbientSound } from "@/hooks/useAmbientSound";
import { useBookshelf } from "@/hooks/useBookshelf";
import { ConfirmModal } from "@/ui/ConfirmModal";

interface NavItem {
  label: string;
  onClick?: () => void;
  icon: React.ReactNode;
  description: string;
  badge?: string;
}

interface HeaderProps {
  onMyRatingsClick?: () => void;
  onSearch?: (query: string) => void;
  searchValue?: string;
  showTemplatesNav?: boolean;
  showSearch?: boolean;
  activeItem?: string;
  /** Скрывает кнопку "Выйти" — для страниц, где она может сбивать (например, редактор тир-листов) */
  hideLogout?: boolean;
}

/** Светлая ли тема под хедером: проверяем --theme-bg у контейнера темы (редактор/полка) */
function detectLightTheme(): boolean {
  const themed = document.querySelector<HTMLElement>("main[data-theme], .clay-shelf");
  const root = themed ?? document.documentElement;
  const bg = getComputedStyle(root).getPropertyValue("--theme-bg").trim();
  const hex = bg.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/)?.[1];
  if (!hex) return false;
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

export const Header = ({
  onMyRatingsClick,
  onSearch,
  searchValue = "",
  showTemplatesNav = true,
  showSearch = false,
  activeItem: activeItemProp,
  hideLogout = false,
}: HeaderProps = {}) => {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(false);
  const ratingsRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user: authUser, logout } = useAuth();
  const { totalCount } = useBookshelf();
  const navigate = useNavigate();
  const location = useLocation();

  // Светлая тема под хедером (полка/редактор) → тёмный текст на светлом стекле
  const [isLightTheme, setIsLightTheme] = useState(() => detectLightTheme());

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      const themedChanged = mutations.some((m) =>
        [m.target, ...Array.from(m.addedNodes)]
          .some((n) => n instanceof Element && (n.matches?.("[data-theme], .clay-shelf") || n.querySelector?.("[data-theme], .clay-shelf"))),
      );
      if (themedChanged) setIsLightTheme(detectLightTheme());
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Пересчёт при переходе между страницами (после отрисовки нового роута)
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsLightTheme(detectLightTheme()));
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  const ambient = useAmbientSound();
  const ambientIsPlaying = ambient.isPlaying;
  const ambientActive = ambient.category !== null;

  // Дефолтная навигация для "Главная": авторизованные → дашборд, гости → лендинг
  const handleDefaultMyRatings = () => {
    navigate(isAuthenticated ? "/dashboard" : "/");
  };

  // Автоматическое определение активной вкладки на основе пути
  const activeItem =
    activeItemProp ||
    (() => {
      const path = location.pathname;
      if (path === "/rankings") return "Рейтинги";
      if (path === "/celebrities" || path.startsWith("/celebrities/"))
        return "Рейтинги";
      if (path === "/community") return "Новости";
      if (path === "/templates" || path.startsWith("/templates/"))
        return "Тир-листы";
      if (path === "/shelf") return "Полка";
      if (path === "/" || path === "/dashboard") return "Главная";
      return undefined;
    })();

  // Закрытие дропдауна по Escape и клику вне
  const closeRatings = useCallback(() => setRatingsOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRatings();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        ratingsRef.current &&
        !ratingsRef.current.contains(e.target as Node)
      ) {
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

  const handleRatingsClick = () => setRatingsOpen((prev) => !prev);

  const handleRatingsSubNav = (path: string) => {
    navigate(path);
    setRatingsOpen(false);
  };

  const handleSearchChange = (query: string) => {
    onSearch?.(query);
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    window.location.href = "/";
  };

  const cancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  const navItems: NavItem[] = [
    {
      label: "Главная",
      onClick: onMyRatingsClick ?? handleDefaultMyRatings,
      icon: <List size={18} />,
      description: "Управление рейтингами",
    },
    {
      label: "Рейтинги",
      onClick: handleRatingsClick,
      icon: <BarChart3 size={18} />,
      description: "Редакционные подборки",
    },
    {
      label: "Новости",
      onClick: () => navigate("/community"),
      icon: <Globe size={18} />,
      description: "Новости сообщества",
    },
    ...(showTemplatesNav
      ? [
          {
            label: "Тир-листы",
            onClick: () => navigate("/templates"),
            icon: <Library size={18} />,
            description: "Готовые шаблоны",
          },
        ]
      : []),
    {
      label: "Полка",
      onClick: () => navigate("/shelf"),
      icon: <BookMarked size={18} />,
      description: "Книги, которые вы читали или хотите прочитать",
      badge: totalCount > 0 ? String(totalCount) : undefined,
    },
    {
      label: "Поддержать",
      onClick: () => navigate("/pricing"),
      icon: (
        <span className="inline-block text-xl leading-none animate-dove-flight">
          🕊️
        </span>
      ),
      description: "Поддержать проект",
    },
  ];

  return (
    <>
      <header className={`fixed top-2 xs:top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] xs:w-[calc(100%-2rem)] max-w-6xl backdrop-blur-xl rounded-xl xs:rounded-2xl shadow-2xl border ${
        isLightTheme
          ? "bg-white/30 border-slate-200/50 shadow-black/5"
          : "bg-[#0b0f1f]/40 border-slate-700/30 shadow-black/25"
      }`}>
        <div className="px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 xs:h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 xs:gap-3 shrink-0">
              <Logo onClick={onMyRatingsClick ?? handleDefaultMyRatings} light={isLightTheme} />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0">
              {navItems.map((item) => {
                const analyticsName = `nav.main.${item.label.toLowerCase().replace(/\s+/g, "_")}`;
                const isRatings = item.label === "Рейтинги";
                return (
                  <div
                    key={item.label}
                    className="relative"
                    ref={isRatings ? ratingsRef : undefined}
                  >
                    <button
                      data-analytics={analyticsName}
                      onClick={item.onClick}
                      aria-current={
                        activeItem === item.label ? "page" : undefined
                      }
                      aria-expanded={isRatings ? ratingsOpen : undefined}
                      className={`group relative px-3 py-2 rounded-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        item.onClick ? "cursor-pointer" : "cursor-not-allowed"
                      } ${
                        activeItem === item.label
                          ? isLightTheme
                            ? "text-cyan-700"
                            : "text-cyan-400"
                          : isLightTheme
                            ? "text-slate-700 hover:text-slate-950"
                            : "text-gray-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="relative shrink-0">
                          {item.icon}
                          {item.badge && (
                            <span className={`absolute -top-1.5 -right-1.5 z-10 flex size-4 items-center justify-center rounded-full border text-[9px] font-bold leading-none ${
                              isLightTheme
                                ? "bg-yellow-400 text-yellow-950 border-yellow-600/60"
                                : "bg-yellow-500/90 text-yellow-950 border-yellow-300/60"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </span>
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                        {isRatings && (
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${
                              ratingsOpen ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>
                      {/* Hover indicator */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-cyan-400 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full"></div>
                    </button>

                    {/* Dropdown для «Рейтинги» */}
                    {isRatings && ratingsOpen && (
                      <div className="absolute top-full left-0 mt-1 w-56 rounded-xl border border-slate-700/50 bg-[#0f1525]/95 backdrop-blur-xl shadow-2xl shadow-black/60 py-1.5 z-50">
                        <button
                          data-analytics="nav.main.ratings_books"
                          onClick={() => handleRatingsSubNav("/rankings")}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                        >
                          <BarChart3
                            size={16}
                            className="text-cyan-400 shrink-0"
                          />
                          <span>Лучшие книги 2026</span>
                        </button>
                        <button
                          data-analytics="nav.main.ratings_celebrities"
                          onClick={() => handleRatingsSubNav("/celebrities")}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                        >
                          <Star size={16} className="text-amber-400 shrink-0" />
                          <span>Топ знаменитостей</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Right Section - Search & Settings */}
            <div className="flex items-center gap-2 xs:gap-3 shrink-0">
              {/* Search */}
              {showSearch && (
                <SearchBar
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder="Поиск..."
                />
              )}

              {isAuthenticated ? (
                <>
                  {/* Logout Button (Desktop) */}
                  {!hideLogout && (
                    <button
                      data-analytics="auth.logout"
                      onClick={handleLogout}
                      className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        isLightTheme
                          ? "text-slate-700 hover:bg-slate-200/70 hover:text-slate-950"
                          : "text-gray-300 hover:bg-slate-800/50 hover:text-white"
                      }`}
                      title="Выйти"
                      aria-label="Выйти"
                    >
                      <LogOut size={16} />
                      <span>Выйти</span>
                    </button>
                  )}

                  {/* Mobile logout */}
                  {!hideLogout && (
                    <button
                      data-analytics="auth.logout_mobile"
                      onClick={handleLogout}
                      className={`md:hidden p-3.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        isLightTheme
                          ? "text-slate-600 hover:bg-slate-200/70 hover:text-slate-950"
                          : "hover:bg-slate-800/50 text-gray-400 hover:text-white"
                      }`}
                      aria-label="Выйти"
                    >
                      <LogOut size={18} />
                    </button>
                  )}

                  {/* User Avatar + Ambient badge */}
                  <div className="relative flex items-center group">
                    {/* Пульсирующее кольцо вокруг аватарки — пока есть активный плейлист */}
                    {ambientActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full ring-2 ring-[#c1fffe] pointer-events-none"
                        animate={
                          ambientIsPlaying
                            ? { scale: [1, 1.08, 1], opacity: [0.6, 0.2, 0.6] }
                            : { scale: 1, opacity: 0.3 }
                        }
                        transition={{
                          duration: 2,
                          repeat: ambientIsPlaying ? Infinity : 0,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                    <button
                      data-analytics="nav.main.profile"
                      onClick={() => navigate("/profile")}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-gray-100/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      title="Профиль"
                      aria-label="Перейти в профиль"
                    >
                      <Avatar
                        url={authUser?.avatarUrl}
                        username={authUser?.username}
                        size="sm"
                        className="size-8"
                      />
                    </button>

                    {/* Бейдж управления — пока есть активный плейлист */}
                    {ambientActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          ambient.toggle();
                        }}
                        className="absolute -bottom-1 -right-1 z-20 flex size-5 items-center justify-center rounded-full border border-[#c1fffe] bg-black/90 text-[#c1fffe] transition-transform hover:scale-110 cursor-pointer"
                        title={ambient.isPlaying ? "Пауза" : "Возобновить"}
                        aria-label={ambient.isPlaying ? "Пауза" : "Возобновить"}
                      >
                        {ambient.isPlaying ? (
                          <Pause size={10} />
                        ) : (
                          <Play size={10} />
                        )}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <button
                  data-analytics="auth.login_header"
                  onClick={() => navigate("/auth?mode=login")}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  title="Войти"
                  aria-label="Войти"
                >
                  Войти
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        title="Вы пытаетесь выйти?"
        description={
          <>
            До скорой встречи,{" "}
            <span className="font-bold text-[#de7eeb]">
              {authUser?.username}
            </span>
            !
          </>
        }
        confirmText="Выйти"
        cancelText="Отмена"
      />
    </>
  );
};
