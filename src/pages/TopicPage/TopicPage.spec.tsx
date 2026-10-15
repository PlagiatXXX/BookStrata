// src/pages/TopicPage/TopicPage.spec.tsx
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TopicPage from "./TopicPage";

vi.mock("@/lib/api-client", () => ({ api: { get: vi.fn() } }));
const seoProps: Record<string, unknown> = {};
vi.mock("@/components/SEO/SEOHead", () => ({
  SEOHead: (p: Record<string, unknown>) => {
    Object.assign(seoProps, p);
    return null;
  },
}));
vi.mock("@/layouts/DashboardLayout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/CommunityComponents/CollectionCard", () => ({
  CollectionCard: ({ collection }: { collection: { title: string } }) => (
    <div>{collection.title}</div>
  ),
}));

import { api } from "@/lib/api-client";
import type { CollectionItem } from "@/types/collection";

const collection = (id: number, slug: string, title: string): CollectionItem =>
  ({
    id,
    slug,
    title,
    categoryId: "horror",
    type: "curated",
    isPublished: true,
    order: id,
    isFeatured: false,
    coverImageUrl: "",
    tags: [],
    excerpt: "",
    createdAt: "",
    updatedAt: "",
  }) as CollectionItem;

function renderPage(path = "/topics/horror") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/topics/:slug" element={<TopicPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(seoProps).forEach((k) => delete seoProps[k]);
});

describe("TopicPage — хлебные крошки на хаб /collections", () => {
  it("визуальные крошки содержат ссылку обратно на хаб «Подборки книг»", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [collection(1, "a", "Подборка А"), collection(2, "b", "Подборка Б")],
      meta: { totalItems: 2 },
    });
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Хлебные крошки" });
    const link = within(nav).getByRole("link", { name: "Подборки книг" });
    expect(link).toHaveProperty("href", expect.stringContaining("/collections"));
  });

  it("JSON-LD breadcrumbs содержат промежуточную крошу хаба", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [collection(1, "a", "Подборка А"), collection(2, "b", "Подборка Б")],
      meta: { totalItems: 2 },
    });
    renderPage();
    await screen.findByRole("navigation", { name: "Хлебные крошки" });
    const crumbs = seoProps.breadcrumbs as { name: string; url: string }[];
    expect(crumbs).toContainEqual({ name: "Подборки книг", url: "/collections" });
    expect(crumbs[0]).toEqual({ name: "Главная", url: "/" });
  });

  it("в пустом состоянии breadcrumbs тоже ведут на хаб", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [], meta: { totalItems: 0 } });
    renderPage();
    await screen.findByText(/пока нет подборок/i);
    const crumbs = seoProps.breadcrumbs as { name: string; url: string }[];
    expect(crumbs).toContainEqual({ name: "Подборки книг", url: "/collections" });
  });
});
