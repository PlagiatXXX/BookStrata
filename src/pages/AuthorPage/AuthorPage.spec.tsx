// src/pages/AuthorPage/AuthorPage.spec.tsx
// Страница автора /authors/:slug: hero + SEO-текст + партнёрка + 404
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("AuthorPage — каталог книг", () => {
  const catalogFixture: AuthorPageData = {
    ...fixture,
    books: [
      {
        id: 1, title: "Слабая", slug: "slabaya", coverImageUrl: "/1.jpg",
        publishedYear: 2001, genre: "Роман", rating: 6.0, ratingsCount: 12,
      },
      {
        id: 2, title: "Сильная", slug: "silnaya", coverImageUrl: "/2.jpg",
        publishedYear: 2000, genre: "Роман", rating: 9.0, ratingsCount: 20,
      },
      {
        id: 3, title: "Средняя", slug: "srednyaya", coverImageUrl: "/3.jpg",
        publishedYear: 1999, genre: null, rating: 7.5, ratingsCount: 8,
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(getAuthorBySlug).mockReset();
  });

  const bookTitles = () =>
    screen.getAllByRole("heading", { level: 3 }).map((n) => n.textContent);

  it("по умолчанию — хронология по году издания", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(catalogFixture);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лев Толстой" })).toBeInTheDocument();
    expect(bookTitles()).toEqual(["Средняя", "Сильная", "Слабая"]);
    expect(screen.getByText("1999")).toBeInTheDocument();
    expect(screen.getByText("7.5 / 10")).toBeInTheDocument();
  });

  it("клик «По рейтингу» — сортировка по убыванию рейтинга", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(catalogFixture);

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "По рейтингу" }));

    expect(bookTitles()).toEqual(["Сильная", "Средняя", "Слабая"]);
  });

  it("возврат к «По порядку» — снова хронология", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(catalogFixture);

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "По рейтингу" }));
    fireEvent.click(screen.getByRole("button", { name: "По порядку" }));

    expect(bookTitles()).toEqual(["Средняя", "Сильная", "Слабая"]);
  });

  it("книга со slug — ссылка на страницу книги; без slug — не ссылка", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...catalogFixture,
      books: [
        { ...catalogFixture.books[0], slug: null },
        catalogFixture.books[1],
      ],
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лев Толстой" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Сильная/ })).toHaveAttribute(
      "href",
      "/books/silnaya",
    );
    expect(screen.queryByRole("link", { name: /Слабая/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Слабая" })).toBeInTheDocument();
  });

  it("секция каталога есть, счётчик книг — в hero", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(catalogFixture);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Книги автора" })).toBeInTheDocument();
    expect(screen.getByText(/12 книг/)).toBeInTheDocument();
  });
});

describe("AuthorPage — лучшие/слабые книги и тир-листы", () => {
  const ratedFixture: AuthorPageData = {
    ...fixture,
    topBooks: [
      { id: 9, title: "Мастер", slug: "master", coverImageUrl: "/m.jpg",
        publishedYear: null, genre: null, rating: 9.8, ratingsCount: 100 },
    ],
    bottomBooks: [
      { id: 10, title: "Слабая книга", slug: null, coverImageUrl: "/w.jpg",
        publishedYear: null, genre: null, rating: 5.2, ratingsCount: 30 },
    ],
    tierLists: [
      { id: "tl1", slug: "top-100", title: "Топ-100 книг" },
      { id: "tl2", slug: "klassika", title: "Классика" },
    ],
  };

  beforeEach(() => {
    vi.mocked(getAuthorBySlug).mockReset();
  });

  it("блоки «Лучшие книги» и «Слабые книги» с рейтингами", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(ratedFixture);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лучшие книги" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Мастер" })).toBeInTheDocument();
    expect(screen.getByText("9.8 / 10")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Слабые книги" })).toBeInTheDocument();
    expect(screen.getByText("5.2 / 10")).toBeInTheDocument();
  });

  it("тир-листы: счётчик и ссылки на /tier-lists/{slug}", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(ratedFixture);

    renderPage();

    const heading = await screen.findByRole("heading", { name: /В тир-листах/ });
    expect(heading).toBeInTheDocument();

    const tlLink = screen.getByRole("link", { name: /Топ-100 книг/ });
    expect(tlLink).toHaveAttribute("href", "/tier-lists/top-100");
    expect(screen.getByRole("link", { name: /Классика/ })).toHaveAttribute(
      "href",
      "/tier-lists/klassika",
    );
  });

  it("пустые массивы — блоки не рендерятся", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      topBooks: [],
      bottomBooks: [],
      tierLists: [],
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Книги автора" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Лучшие книги" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Слабые книги" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /В тир-листах/ })).not.toBeInTheDocument();
  });
});
