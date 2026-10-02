// src/pages/AuthorsPage/AuthorsPage.spec.tsx
// Страница «Все авторы» /authors: список, поиск, пагинация «Показать ещё»
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AuthorsPage from "./index";

vi.mock("@/lib/authorsApi", () => ({
  getAllAuthors: vi.fn(),
}));
// Header/Footer требуют AuthProvider — в тесте не нужны
vi.mock("@/ui/Header", () => ({ Header: () => null }));
vi.mock("@/ui/Footer", () => ({ Footer: () => null }));

import { getAllAuthors } from "@/lib/authorsApi";

type AuthorListItem = { id: number; name: string; slug: string; bookCount: number };

function makeAuthor(id: number, name: string, bookCount = 1): AuthorListItem {
  return { id, name, slug: `author-${id}`, bookCount };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/authors"]}>
        <HelmetProvider>
          <AuthorsPage />
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthorsPage", () => {
  it("рендерит заголовок и список авторов (имя + число книг)", async () => {
    vi.mocked(getAllAuthors).mockResolvedValue([
      makeAuthor(1, "Лев Толстой", 12),
      makeAuthor(2, "Артур Конан Дойл", 3),
    ]);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Все авторы" })).toBeInTheDocument();
    // ждём асинхронную загрузку списка
    expect(await screen.findByRole("link", { name: /Лев Толстой/ })).toHaveAttribute(
      "href",
      "/authors/author-1",
    );
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("книг")).toBeInTheDocument();
  });

  it("крошки не прячутся под fixed-хедером (контейнер с pt-24)", async () => {
    vi.mocked(getAllAuthors).mockResolvedValue([makeAuthor(1, "Лев Толстой")]);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Все авторы" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Хлебные крошки" });
    expect(nav.parentElement).toHaveClass("pt-24");
  });

  it("показывает первых 6, остальные по кнопке «Показать ещё»", async () => {
    const user = userEvent.setup();
    vi.mocked(getAllAuthors).mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => makeAuthor(i + 1, `Автор ${i + 1}`)),
    );

    renderPage();
    expect(await screen.findByText("Автор 6")).toBeInTheDocument();
    expect(screen.queryByText("Автор 7")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /показать ещё/i }));

    expect(screen.getByText("Автор 7")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /показать ещё/i })).not.toBeInTheDocument();
  });

  it("≤6 авторов — кнопки «Показать ещё» нет", async () => {
    vi.mocked(getAllAuthors).mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => makeAuthor(i + 1, `Автор ${i + 1}`)),
    );

    renderPage();
    expect(await screen.findByText("Автор 6")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /показать ещё/i })).not.toBeInTheDocument();
  });

  it("поиск фильтрует список на клиенте", async () => {
    const user = userEvent.setup();
    vi.mocked(getAllAuthors).mockResolvedValue([
      makeAuthor(1, "Лев Толстой"),
      makeAuthor(2, "Левитан"),
      makeAuthor(3, "Артур Конан Дойл"),
    ]);

    renderPage();
    expect(await screen.findByText("Лев Толстой")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "Лев");

    expect(screen.getByText("Лев Толстой")).toBeInTheDocument();
    expect(screen.getByText("Левитан")).toBeInTheDocument();
    expect(screen.queryByText("Артур Конан Дойл")).not.toBeInTheDocument();
  });

  it("поиск без совпадений — пустое состояние", async () => {
    const user = userEvent.setup();
    vi.mocked(getAllAuthors).mockResolvedValue([makeAuthor(1, "Лев Толстой")]);

    renderPage();
    expect(await screen.findByText("Лев Толстой")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "Несуществующий");

    expect(screen.queryByText("Лев Толстой")).not.toBeInTheDocument();
    expect(screen.getByText(/ничего не найдено/i)).toBeInTheDocument();
  });

  it("после уточнения поиска лимит сбрасывается (показ первых 6)", async () => {
    const user = userEvent.setup();
    vi.mocked(getAllAuthors).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => makeAuthor(i + 1, `Автор ${i + 1}`)),
    );

    renderPage();
    expect(await screen.findByText("Автор 6")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /показать ещё/i }));
    expect(screen.getByText("Автор 7")).toBeInTheDocument();

    const searchbox = screen.getByRole("searchbox");
    await user.type(searchbox, "Автор");
    await user.clear(searchbox);

    // после ввода/очистки лимит снова 6
    expect(screen.queryByText("Автор 7")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /показать ещё/i })).toBeInTheDocument();
  });
});
