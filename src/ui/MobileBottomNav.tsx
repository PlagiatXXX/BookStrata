import { useNavigate, useLocation } from "react-router-dom";
import { List, Globe, Users, Library } from "lucide-react";

interface MobileBottomNavProps {
  showTemplatesNav?: boolean;
}

const NAV_ITEMS = [
  { label: "Главная", icon: List, path: "/" },
  { label: "Библиотека", icon: Library, path: "/templates" },
  { label: "Новости", icon: Globe, path: "/community" },
  { label: "Актив", icon: Users, path: "/forum" },
] as const;

export function MobileBottomNav({ showTemplatesNav = true }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const items = showTemplatesNav
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.label !== "Библиотека");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-background-dark/95 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
                isActive
                  ? "text-cyan-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
