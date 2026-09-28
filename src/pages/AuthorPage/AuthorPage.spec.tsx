// src/pages/AuthorPage/AuthorPage.spec.tsx
// Страница автора /authors/:slug: hero + SEO-текст + партнёрка + 404
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AuthorPage from "./index";
import type { AuthorPageData } from "@/lib/authorsApi";

vi.mock("@/lib/authorsApi", () => ({
  getAuthorBySlug: vi.fn(),
}));
// Header/Footer требуют AuthProvider — в тесте не нужны
vi.mock("@/ui/Header", () => ({ Header: () => null }));
vi.mock("@/ui/Footer", () => ({ Footer: () => null }));

import { getAuthorBySlug } from "@/lib/authorsApi";

const fixture: AuthorPageData = {
  author: {
    id: 1,
    name: "Лев Толстой",
    slug: "lev-tolstoy",
    seoDescription: "Русский писатель, классик мировой литературы.",
    bookCount: 12,
    avgRating: 8.7,
  },
  books: [
    {
      id: 1,
      title: "Война и мир",
      slug: "voyna-i-mir",
      coverImageUrl: "/covers/wim.jpg",
      publishedYear: 1869,
      genre: "Роман",
      rating: 9.5,
      ratingsCount: 42,
    },
  ],
  topBooks: [],
  bottomBooks: [],
  tierLists: [],
};

function renderPage(initialEntries: string[] = ["/authors/lev-tolstoy"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <HelmetProvider>
          {/* useParams работает только внутри Route */}
          <Routes>
            <Route path="/authors/:slug" element={<AuthorPage />} />
          </Routes>
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AuthorPage", () => {
  beforeEach(() => {
    vi.mocked(getAuthorBySlug).mockReset();
  });

  it("показывает имя, SEO-текст, количество книг и кнопку партнёрки", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лев Толстой" })).toBeInTheDocument();
    expect(screen.getByText(/Русский писатель, классик мировой литературы/)).toBeInTheDocument();
    expect(screen.getByText(/12 книг/)).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /читать|купить/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("chitai-gorod.ru"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("sponsored"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("вызывает API с slug из маршрута", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage(["/authors/lev-tolstoy"]);

    expect(await screen.findByRole("heading", { name: "Лев Толстой" })).toBeInTheDocument();
    expect(getAuthorBySlug).toHaveBeenCalledWith("lev-tolstoy");
  });

  it("автор без книг — кнопка партнёрки всё равно есть", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({ ...fixture, books: [] });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лев Толстой" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /читать|купить/i })).toBeInTheDocument();
  });

  it("404 от API → NotFoundPage", async () => {
    const err = Object.assign(new Error("not found"), { status: 404 });
    vi.mocked(getAuthorBySlug).mockRejectedValue(err);

    renderPage(["/authors/net-takogo"]);

    expect(await screen.findByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
  });

  it("ошибка сети → NotFoundPage (не рендерим пустоту)", async () => {
    vi.mocked(getAuthorBySlug).mockRejectedValue(new Error("network"));

    renderPage();

    expect(await screen.findByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
  });
});
