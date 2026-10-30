import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import SearchPage from "./SearchPage";

vi.mock("@/lib/bookApi", () => ({
  searchCatalogBooks: vi.fn(),
}));

vi.mock("@/lib/authorsApi", () => ({
  searchAuthors: vi.fn(),
}));

vi.mock("@/ui/Header", () => ({ Header: () => <div data-testid="mock-header" /> }));
vi.mock("@/ui/Footer", () => ({ Footer: () => <div data-testid="mock-footer" /> }));
vi.mock("@/ui/MobileBottomNav", () => ({ MobileBottomNav: () => null }));

import { searchCatalogBooks } from "@/lib/bookApi";
import { searchAuthors } from "@/lib/authorsApi";

function renderSearchPage(initialUrl = "/search?q=дюна") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <HelmetProvider>
          <SearchPage />
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("должен читать параметр запроса q из URL и запускать поиск", async () => {
    vi.mocked(searchCatalogBooks).mockResolvedValueOnce([
      {
        id: 1,
        slug: "dune-frank-herbert",
        title: "Дюна",
        author: "Фрэнк Герберт",
        coverImageUrl: "/covers/dune.webp",
        rating: 9.2,
      },
    ]);
    vi.mocked(searchAuthors).mockResolvedValueOnce([]);

    renderSearchPage("/search?q=дюна");

    expect(screen.getByRole("textbox", { name: /поиск/i })).toHaveValue("дюна");

    await waitFor(() => {
      expect(searchCatalogBooks).toHaveBeenCalledWith("дюна");
      expect(screen.getByText("Дюна")).toBeInTheDocument();
      expect(screen.getByText("Фрэнк Герберт")).toBeInTheDocument();
    });
  });

  it("должен отображать карточку найденного автора, если автор совпадает", async () => {
    vi.mocked(searchCatalogBooks).mockResolvedValueOnce([]);
    vi.mocked(searchAuthors).mockResolvedValueOnce([
      {
        id: 10,
        name: "Фрэнк Герберт",
        slug: "frenk-gerbert",
        bookCount: 12,
        heroImageUrl: null,
      },
    ]);

    renderSearchPage("/search?q=герберт");

    await waitFor(() => {
      expect(screen.getByText("Фрэнк Герберт")).toBeInTheDocument();
      expect(screen.getByText(/12 книг/i)).toBeInTheDocument();
    });
  });

  it("должен показывать пустое состояние, если результатов нет", async () => {
    vi.mocked(searchCatalogBooks).mockResolvedValueOnce([]);
    vi.mocked(searchAuthors).mockResolvedValueOnce([]);

    renderSearchPage("/search?q=несуществующаякнига");

    await waitFor(() => {
      expect(screen.getByText(/ничего не нашлось/i)).toBeInTheDocument();
    });
  });

  it("должен показывать подсказку, если поисковый запрос пустой", () => {
    renderSearchPage("/search");

    expect(screen.getByText(/введите название книги или автора/i)).toBeInTheDocument();
    expect(searchCatalogBooks).not.toHaveBeenCalled();
    expect(searchAuthors).not.toHaveBeenCalled();
  });

  it("позволяет ввести новый запрос пользователю", async () => {
    vi.mocked(searchCatalogBooks).mockResolvedValue([]);
    vi.mocked(searchAuthors).mockResolvedValue([]);

    renderSearchPage("/search");
    const input = screen.getByRole("textbox", { name: /поиск/i });

    await userEvent.type(input, "кинг");
    expect(input).toHaveValue("кинг");
  });
});
