import React from "react";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { MobileBottomNav } from "@/ui/MobileBottomNav";
import { PageContainer } from "@/components/PageContainer/PageContainer";

type BgVariant = "gradient" | "dark";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onMyRatingsClick?: () => void;
  onSearch?: (query: string) => void;
  searchValue?: string;
  showTemplatesNav?: boolean;
  showSearch?: boolean;
  activeItem?: string;
  /** Отключает max-w констрейнт — для редактора тир-листов, которому нужно на всю ширину */
  fullWidth?: boolean;
  /** Скрывает мобильную нижнюю навигацию — для страниц, где есть свой нижний тулбар (например, редактор тир-листов) */
  hideMobileNav?: boolean;
  /** Скрывает кнопку "Выйти" в хедере */
  hideLogout?: boolean;
  /** Вариант фона: "gradient" — сине-фиолетовый градиент (по умолчанию), "dark" — нейтральный тёмный для нео-бруталист страниц */
  bgVariant?: BgVariant;
}

const BG_STYLES: Record<BgVariant, React.CSSProperties> = {
  gradient: {
    background: [
      "radial-gradient(circle at 50% 85%, rgba(0,170,255,0.18) 0%, rgba(0,170,255,0.08) 25%, transparent 55%)",
      "radial-gradient(circle at 95% 95%, rgba(180,0,255,0.15) 0%, transparent 30%)",
      "linear-gradient(180deg, #02062c 0%, #040b35 25%, #02081d 60%, #00060d 100%)",
    ].join(", "),
    backgroundAttachment: "fixed",
  },
  dark: {
    backgroundColor: "#121212",
  },
};

export function DashboardLayout({
  children,
  onMyRatingsClick,
  onSearch,
  searchValue,
  showTemplatesNav = true,
  showSearch = false,
  activeItem,
  fullWidth = false,
  hideMobileNav = false,
  hideLogout = false,
  bgVariant = "gradient",
}: DashboardLayoutProps) {
  return (
    <div
      className="flex min-h-screen flex-col text-white"
      style={BG_STYLES[bgVariant]}
    >
      <Header
        onMyRatingsClick={onMyRatingsClick}
        onSearch={onSearch}
        searchValue={searchValue}
        showTemplatesNav={showTemplatesNav}
        showSearch={showSearch}
        activeItem={activeItem}
        hideLogout={hideLogout}
      />
      <main className={`grid flex-1 grid-cols-1 pt-24 overflow-x-hidden ${
        hideMobileNav ? "" : "pb-16 md:pb-0"
      }`}>
        {fullWidth ? (
          children
        ) : (
          <PageContainer>{children}</PageContainer>
        )}
      </main>
      {!hideMobileNav && <MobileBottomNav showTemplatesNav={showTemplatesNav} />}
      <Footer />
    </div>
  );
}
