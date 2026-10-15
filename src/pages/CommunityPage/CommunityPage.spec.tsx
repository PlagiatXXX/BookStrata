// src/pages/CommunityPage/CommunityPage.spec.tsx
import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CommunityPage from "./CommunityPage";

vi.mock("@/layouts/DashboardLayout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/CommunityComponents/HeroSection", () => ({
  HeroSection: () => <div>hero</div>,
}));
vi.mock("@/components/CommunityComponents/CategoryTabs", () => ({
  CategoryTabs: () => <div>tabs</div>,
}));
vi.mock("@/components/CommunityComponents/CollectionGrid", () => ({
  CollectionGrid: () => <div>grid</div>,
}));
vi.mock("@/components/CommunityComponents/NewsSection", () => ({
  NewsSection: () => <div>news</div>,
}));
vi.mock("@/components/CommunityComponents/ExternalNewsSection", () => ({
  ExternalNewsSection: () => <div>external-news</div>,
}));
vi.mock("@/components/CommunityComponents/CollectionsSection", () => ({
  CollectionsSection: () => <div>literary</div>,
}));
vi.mock("@/components/Reveal/Reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/SEO/SEOHead", () => ({ SEOHead: () => null }));
vi.mock("./CommunityPage.css", () => ({}));

describe("CommunityPage — вход на хаб коллекций", () => {
  it("у заголовка секции «Подборки BookStrata» есть кнопка «Все коллекции» на /collections", () => {
    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /Подборки BookStrata/ })).toBeTruthy();
    const link = screen.getByRole("link", { name: /Все коллекции/ });
    expect(link).toHaveProperty("href", expect.stringContaining("/collections"));
  });
});
