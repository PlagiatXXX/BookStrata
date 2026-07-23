import { useNavigate, useLocation } from "react-router-dom";
import { List, Globe, Library, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuthContext";
import { useBottomSafeOffset } from "@/hooks/useBottomSafeOffset";

interface MobileBottomNavProps {
  showTemplatesNav?: boolean;
}

export function MobileBottomNav({ showTemplatesNav = true }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const bottomOffset = useBottomSafeOffset();

  const NAV_ITEMS = [
    { label: "Главная", icon: List, path: isAuthenticated ? "/dashboard" : "/" },
    { label: "Рейтинг", icon: BarChart3, path: "/rankings" },
    { label: "Библиотека", icon: Library, path: "/templates" },
    { label: "Новости", icon: Globe, path: "/community" },
  ] as const;

  const items = showTemplatesNav
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.label !== "Библиотека");

  return (
    <nav className="fixed left-0 right-0 z-50 md:hidden border-t border-white/[0.06] bg-black/85 backdrop-blur-2xl" style={{ bottom: bottomOffset }}>
      <div className="flex items-stretch h-14">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && item.path !== "/dashboard" && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              data-analytics={`nav.mobile.${item.label.toLowerCase()}`}
              onClick={() => navigate(item.path)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-[transform,color] duration-100 ease-out cursor-pointer active:scale-[0.93] ${
                isActive
                  ? "text-cyan-400"
                  : "text-white/40 hover:text-white active:text-white"
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
