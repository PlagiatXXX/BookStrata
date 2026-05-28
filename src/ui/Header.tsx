import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { Logo } from "./Logo";
import { Avatar } from "@/components/Avatar";
import { List, Folder, X, Menu, Globe, LogOut, Users, Crown } from "lucide-react";
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
}

export const Header = ({
  onMyRatingsClick,
  onSearch,
  searchValue = "",
  showTemplatesNav = true,
  showSearch = false,
  activeItem: activeItemProp,
}: HeaderProps = {}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
        return "Шаблоны";
      if (path === "/" || path.startsWith("/tier-lists/"))
        return "Мои Рейтинги";
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
    navigate("/auth", { replace: true });
  };

  const cancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  const navItems: NavItem[] = [
    {
      label: "Мои Рейтинги",
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
    {
      label: "Pro",
      icon: <Crown size={16} className="text-yellow-400" />,
      description: "Премиум-возможности",
      badge: "скоро",
    },
    ...(showTemplatesNav
      ? [
          {
            label: "Шаблоны",
            onClick: () => navigate("/templates"),
            icon: <Folder size={18} />,
            description: "Готовые шаблоны",
          },
        ]
      : []),
  ];

  return (
    <>
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl bg-background-dark/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40 border border-slate-700/50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
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
          <div className="flex items-center gap-3 shrink-0">
            {/* Search */}
            {showSearch && (
              <SearchBar
                value={searchValue}
                onChange={handleSearchChange}
                placeholder="Поиск..."
              />
            )}

            {/* Logout Button (Desktop) */}
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="Выйти"
              aria-label="Выйти"
            >
              <LogOut size={16} />
              <span>Выйти</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-800/50 text-gray-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* User Avatar */}
            {isAuthenticated && (
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-gray-100/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                title="Профиль"
                aria-label="Перейти в профиль"
              >
                <Avatar
                  url={authUser?.avatarUrl}
                  username={authUser?.username}
                  size="sm"
                  className="w-8 h-8 sm:w-8 sm:h-8 max-sm:w-6 max-sm:h-6"
                  isPro={authUser?.isPro}
                />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden pb-4 space-y-2 border-t border-slate-700/50 pt-4">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer ${
                  activeItem === item.label
                    ? "text-cyan-400"
                    : "text-gray-300 hover:text-white"
                } hover:bg-slate-800/50 transition-all duration-200 text-sm`}
              >
                {item.icon}
                <div className="text-left flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">
                    {item.description}
                  </div>
                </div>
                {item.badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}

            {/* Mobile Profile Link */}
            {isAuthenticated && (
              <button
                onClick={() => {
                  navigate("/profile");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-gray-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200 text-sm"
              >
                <Avatar
                  url={authUser?.avatarUrl}
                  username={authUser?.username}
                  size="sm"
                  isPro={authUser?.isPro}
                />
                <div className="text-left flex-1">
                  <div className="font-medium">Профиль</div>
                  <div className="text-xs text-gray-500">
                    {authUser?.username}
                  </div>
                </div>
              </button>
            )}

            {/* Mobile Logout Button */}
            {isAuthenticated && (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-red-400 hover:text-red-300 hover:bg-slate-800/50 transition-all duration-200 text-sm border-t border-slate-700/50 mt-2 pt-4"
              >
                <LogOut size={18} />
                <div className="font-medium">Выйти</div>
              </button>
            )}
          </nav>
        )}
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
