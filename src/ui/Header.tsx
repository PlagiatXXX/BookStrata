import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { Logo } from "./Logo";
import { Avatar } from "@/components/Avatar";
import { List, Users, Folder, X, Menu, Globe } from "lucide-react";

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
  showSearch = true,
  activeItem: activeItemProp,
}: HeaderProps = {}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user: authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Автоматическое определение активной вкладки на основе пути
  const activeItem = activeItemProp || (() => {
    const path = location.pathname;
    if (path === "/community") return "Новости";
    if (path === "/templates" || path.startsWith("/templates/")) return "Шаблоны";
    if (path === "/" || path.startsWith("/tier-lists/")) return "Мои Рейтинги";
    return undefined;
  })();

  // Обновлять данные пользователя при изменении аватара
  useEffect(() => {
    const handleAvatarUpdate = () => {
      // Trigger auth context to re-fetch user data
      window.dispatchEvent(new CustomEvent('auth-token-changed'));
    };

    window.addEventListener('avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdate);
  }, []);

  const handleSearchChange = (query: string) => {
    onSearch?.(query);
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
      icon: <Users size={18} />,
      description: "Новости сообщества",
    },
    {
      label: "Сообщество",
      onClick: () => navigate("/community"),
      icon: <Globe size={18} />,
      description: "Сообщество пользователей",
      badge: "Скоро",
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-background-dark/80 backdrop-blur-xl border-b border-slate-700/50 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                disabled={!!item.badge}
                className={`group relative px-4 py-2 rounded-lg cursor-pointer ${
                  activeItem === item.label
                    ? "text-cyan-400"
                    : "text-gray-300 hover:text-white"
                } transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
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

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-800/50 text-gray-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* User Avatar */}
            {isAuthenticated && (
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-gray-100/50 transition-colors cursor-pointer"
                title="Профиль"
              >
                <Avatar
                  url={authUser?.avatarUrl}
                  username={authUser?.username}
                  size="sm"
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
                disabled={!!item.badge}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer ${
                  activeItem === item.label
                    ? "text-cyan-400"
                    : "text-gray-300 hover:text-white"
                } hover:bg-slate-800/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm`}
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
                />
                <div className="text-left flex-1">
                  <div className="font-medium">Профиль</div>
                  <div className="text-xs text-gray-500">
                    {authUser?.username}
                  </div>
                </div>
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
