import React from "react";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { PageContainer } from "@/components/PageContainer/PageContainer";

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
}

export function DashboardLayout({
  children,
  onMyRatingsClick,
  onSearch,
  searchValue,
  showTemplatesNav = true,
  showSearch = false,
  activeItem,
  fullWidth = false,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background-dark text-white">
      <Header
        onMyRatingsClick={onMyRatingsClick}
        onSearch={onSearch}
        searchValue={searchValue}
        showTemplatesNav={showTemplatesNav}
        showSearch={showSearch}
        activeItem={activeItem}
      />
      <main className="grid flex-1 grid-cols-1 pt-24">
        {fullWidth ? (
          children
        ) : (
          <PageContainer>{children}</PageContainer>
        )}
      </main>
      <Footer />
    </div>
  );
}
