import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { Logo } from "./Logo";
import { Avatar } from "@/components/Avatar";
import { List, Library, Globe, LogOut, Users } from "lucide-react";
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
  const { isAuthenticated, user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Автоматическое определение активной вкладки на основе пути
  const activeItem =
    activeItemProp ||
    (() => {
      const path = location.pathname;
      if (path === "/community") return "Новости";
      if (path === "/forum") return "Актив";
      if (path === "/templates" || path.startsWith("/templates/"))
        return "Библиотека";
      if (path === "/" || path === "/dashboard") return "Главная";
      return undefined;
    })();

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
      onClick: onMyRatingsClick,
      icon: <List size={18} />,
      description: "Управление рейтингами",
    },
    {
      label: "Новости",
      onClick: () => navigate("/community"),
      icon: <Globe size={18} />,
      description: "Новости сообщества",
    },
    {
      label: "Актив",
      onClick: () => navigate("/forum"),
      icon: <Users size={18} />,
      description: "Актив сообщества",
    },
    ...(showTemplatesNav
      ? [
          {
            label: "Библиотека",
            onClick: () => navigate("/templates"),
            icon: <Library size={18} />,
            description: "Готовые шаблоны",
          },
        ]
      : []),
    {
      label: "Поддержать",
      onClick: () => navigate("/pricing"),
      icon: <span className="inline-block text-xl leading-none animate-dove-flight">🕊️</span>,
      description: "Поддержать проект",
    },
  ];

  return (
    <>
    <header className="fixed top-2 xs:top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] xs:w-[calc(100%-2rem)] max-w-6xl bg-background-dark/90 backdrop-blur-xl rounded-xl xs:rounded-2xl shadow-2xl shadow-black/40 border border-slate-700/50">
      <div className="px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 xs:h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 xs:gap-3 shrink-0">
            <Logo onClick={onMyRatingsClick} />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                aria-current={activeItem === item.label ? "page" : undefined}
                className={`group relative px-4 py-2 rounded-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  item.onClick ? "cursor-pointer" : "cursor-not-allowed"
                } ${
                  activeItem === item.label
                    ? "text-cyan-400"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                      {item.badge}
                    </span>
                  )}
                </div>
                {/* Hover indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-cyan-400 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full"></div>
              </button>
            ))}
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

            {/* Logout Button (Desktop) */}
            {!hideLogout && (
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                title="Выйти"
                aria-label="Выйти"
              >
                <LogOut size={16} />
                <span>Выйти</span>
              </button>
            )}

            {/* Mobile logout */}
            {!hideLogout && isAuthenticated && (
              <button
                onClick={handleLogout}
                className="md:hidden p-3.5 rounded-lg hover:bg-slate-800/50 text-gray-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                aria-label="Выйти"
              >
                <LogOut size={18} />
              </button>
            )}

            {/* User Avatar */}
            {isAuthenticated && (
              <button
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
        description={<>До скорой встречи, <span className="font-bold text-[#de7eeb]">{authUser?.username}</span>!</>}
        confirmText="Выйти"
        cancelText="Отмена"
      />
    </>
  );
};
