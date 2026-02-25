import React from "react";
import { Header } from "@/ui/Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onMyRatingsClick?: () => void;
  onSearch?: (query: string) => void;
  searchValue?: string;
  showTemplatesNav?: boolean;
  showSearch?: boolean;
  activeItem?: string;
}

export function DashboardLayout({
  children,
  onMyRatingsClick,
  onSearch,
  searchValue,
  showTemplatesNav = true,
  showSearch = true,
  activeItem,
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
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_auto] pt-16">
        {children}
      </main>
    </div>
  );
}
