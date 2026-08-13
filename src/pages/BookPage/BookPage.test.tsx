// src/pages/BookPage/BookPage.test.tsx
// Рендер, загрузка, ошибка, 404 — по плану (Фаза 5, тесты).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useParams } from "react-router-dom";
import BookPage from "./BookPage";
import type { BookPageData } from "@/lib/bookApi";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: vi.fn(() => ({ user: null, isLoading: false })),
}));

// Мокаем «тяжёлые» общие компоненты — они не относятся к странице книги
vi.mock("@/ui/Header", () => ({ Header: () => null }));
vi.mock("@/ui/Footer", () => ({ Footer: () => null }));
vi.mock("@/ui/MobileBottomNav", () => ({ MobileBottomNav: () => null }));
vi.mock("@/pages/NotFoundPage/NotFoundPage", () => ({
  default: () => <div>Страница не найдена</div>,
}));

vi.mock("@/hooks/useBook", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useBook")>();
  return {
    ...actual,
    useBook: vi.fn(),
    useToggleBookLike: vi.fn(() => ({ mutate: vi.fn() })),
    useAddBookToTierList: vi.fn(() => ({ mutate: vi.fn() })),
    useMyTierLists: vi.fn(() => ({ data: [], isLoading: false })),
  };
});

import { useBook } from "@/hooks/useBook";

const mockedUseBook = vi.mocked(useBook);
const mockedUseParams = vi.mocked(useParams);

const bookPageData: BookPageData = {
  book: {
    id: 1,
    slug: "velikij-getssbi",
    title: "Великий Гэтсби",
    author: "Ф. Скотт Фицджеральд",
    coverImageUrl: "https://example.com/cover.jpg",
    description: "Роман, ставший символом века джаза.",
    genre: "Роман",
    tags: ["Классика", "Драма"],
    status: "published",
    rating: 8.4,
    likesCount: 12,
    publishedYear: 1925,
    contextChain: null,
  },
  author: { id: 1, name: "Ф. Скотт Фицджеральд", slug: "f-skott-fitsdzherald" },
  tierLists: [{ id: "tl-1", slug: "top-100", title: "Топ-100 классики", isPublic: true }],
  collections: [{ id: 1, slug: "velikie-romany", title: "Великие романы", type: "collection" }],
  celebrities: [{ id: 1, slug: "stephen-king", name: "Стивен Кинг" }],
  similarBooks: [],
  otherBooksByAuthor: [],
  comments: { items: [], total: 0 },
  userLike: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/books/velikij-getssbi"]}>
        <BookPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BookPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseParams.mockReturnValue({ slug: "velikij-getssbi" });
  });

  it("показывает загрузку, пока данные не пришли", () => {
    mockedUseBook.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as never);
    const { container } = renderPage();
    // Spinner (aria-hidden, без текста) — проверяем по классу анимации
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("рендерит hero: название, автор, жанр, год, рейтинг и теги", async () => {
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Великий Гэтсби" })).toBeTruthy();
    });
    expect(screen.getAllByText("Ф. Скотт Фицджеральд").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Роман").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1925").length).toBeGreaterThan(0);
    expect(screen.getByText("Классика")).toBeTruthy();
    expect(screen.getByText("8.4")).toBeTruthy();
    // Блоки связей
    expect(screen.getByText("Топ-100 классики")).toBeTruthy();
    expect(screen.getByText("Великие романы")).toBeTruthy();
    expect(screen.getByText("Стивен Кинг")).toBeTruthy();
    expect(screen.getByText("Обсуждение")).toBeTruthy();
  });

  it("показывает ошибку с кнопкой повтора при сбое загрузки", () => {
    mockedUseBook.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as never);
    renderPage();
    expect(screen.getByText("Не удалось загрузить страницу книги")).toBeTruthy();
    expect(screen.getByText("Попробовать снова")).toBeTruthy();
  });

  it("показывает 404, если книга не найдена", () => {
    mockedUseBook.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();
    expect(screen.getByText("Страница не найдена")).toBeTruthy();
  });

  it("не zero: разворачивает описание по кнопке «Читать полностью»", async () => {
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    const toggleBtn = await screen.findByText("Читать полностью");
    await userEvent.click(toggleBtn);
    expect(screen.getByText("Свернуть")).toBeTruthy();
  });
});
