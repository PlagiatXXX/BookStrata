import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RankingsPage from "./RankingsPage";

vi.mock("@/lib/collectionsApi", () => ({
  getFeaturedCollections: vi.fn(),
}));

vi.mock("@/lib/bookApi", () => ({
  getTrendingBooks: vi.fn(),
}));

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("@/components/AiLibrarian/AiLibrarianModal", () => ({
  AiLibrarianModal: () => null,
}));

vi.mock("@/layouts/DashboardLayout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/SEO/SEOHead", () => ({
  SEOHead: () => null,
}));

vi.mock("@/components/SEO/Breadcrumbs", () => ({
  Breadcrumbs: () => null,
}));

vi.mock("@/pages/RankingsPage/components/RankingsHero", () => ({
  RankingsHero: () => <div data-testid="hero">Hero</div>,
}));

vi.mock("@/pages/RankingsPage/components/TrendingBooksCarousel", () => ({
  TrendingBooksCarousel: () => <div data-testid="trending">Trending</div>,
}));

vi.mock("@/pages/RankingsPage/components/NeonFlipCollectionCard", () => ({
  NeonFlipCollectionCard: () => <div data-testid="collection-card">Card</div>,
}));

vi.mock("@/pages/RankingsPage/components/GenreNavigation", () => ({
  GenreNavigation: () => <div data-testid="genre-nav">Genres</div>,
}));

vi.mock("@/pages/RankingsPage/components/CreateRatingCta", () => ({
  CreateRatingCta: () => <div data-testid="cta">CTA</div>,
}));

import { getFeaturedCollections } from "@/lib/collectionsApi";
import { getTrendingBooks } from "@/lib/bookApi";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RankingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RankingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    vi.mocked(getFeaturedCollections).mockResolvedValue([] as any);
    vi.mocked(getTrendingBooks).mockResolvedValue([]);
  });

  it("рендерит hero", async () => {
    renderPage();
    expect(await screen.findByTestId("hero")).toBeTruthy();
  });

  it("рендерит жанры и CTA", async () => {
    renderPage();
    expect(await screen.findByTestId("genre-nav")).toBeTruthy();
    expect(screen.getByTestId("cta")).toBeTruthy();
  });

  it("показывает trending когда есть книги", async () => {
    vi.mocked(getTrendingBooks).mockResolvedValue([
      { id: 1, slug: "dune", title: "Дюна", author: "Герберт", coverImageUrl: "/c/dune.jpg" },
    ]);
    renderPage();
    expect(await screen.findByTestId("trending")).toBeTruthy();
  });

  it("скрывает trending когда нет книг", async () => {
    vi.mocked(getTrendingBooks).mockResolvedValue([]);
    renderPage();
    await screen.findByTestId("hero");
    expect(screen.queryByTestId("trending")).toBeNull();
  });

  it("показывает карточки коллекций", async () => {
    vi.mocked(getFeaturedCollections).mockResolvedValue([
      { id: 1, slug: "test", title: "Тест", coverImageUrl: "/c/test.jpg", books: {} },
    ] as any);
    renderPage();
    expect(await screen.findAllByTestId("collection-card")).toHaveLength(1);
  });

  it("показывает скелетон при загрузке", async () => {
    vi.mocked(getFeaturedCollections).mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(await screen.findByTestId("hero")).toBeTruthy();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(6);
  });

  it("показывает ошибку при загрузке коллекций", async () => {
    vi.mocked(getFeaturedCollections).mockRejectedValue(new Error("fail"));
    renderPage();
    expect(await screen.findByText(/не удалось загрузить подборки/i)).toBeTruthy();
  });
});
