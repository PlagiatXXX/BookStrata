// src/pages/BookPage/BookPage.test.tsx
// Рендер, загрузка, ошибка, 404 — по плану (Фаза 5, тесты).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, useParams } from "react-router-dom";
import BookPage from "./BookPage";
import { buildBookJsonLd, buildDescriptionSnippet } from "./seo";
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

vi.mock("@/hooks/useBookRating", () => ({
  useBookRatings: vi.fn(() => ({ data: null })),
  useMyBookRating: vi.fn(() => ({ data: null })),
  useRateBook: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

const toggleStatusMock = vi.fn();
vi.mock("@/hooks/useBookshelf", () => ({
  useBookshelf: vi.fn(() => ({ shelf: {}, toggleStatus: toggleStatusMock })),
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
import { useBookshelf } from "@/hooks/useBookshelf";
import { useAuth } from "@/hooks/useAuthContext";

const mockedUseBook = vi.mocked(useBook);
const mockedUseBookshelf = vi.mocked(useBookshelf);
const mockedUseAuth = vi.mocked(useAuth);
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
        <HelmetProvider>
          <BookPage />
        </HelmetProvider>
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
    expect(screen.getAllByText("1925 г.").length).toBeGreaterThan(0);
    expect(screen.getByText("#Классика")).toBeTruthy();
    expect(screen.getAllByText("8.4").length).toBeGreaterThan(0);
    // Кнопка «Хочу прочитать» вместо лайка
    expect(screen.getByText("Хочу прочитать")).toBeTruthy();
    expect(screen.queryByText("12 лайков")).toBeNull();
    // Блоки связей
    expect(screen.getByText("Топ-100 классики")).toBeTruthy();
    expect(screen.getByText("Великие романы")).toBeTruthy();
    expect(screen.getByText("Стивен Кинг")).toBeTruthy();
    expect(screen.getByText("Обсуждение")).toBeTruthy();
  });

  it("«Хочу прочитать» добавляет книгу на полку (want_to_read)", async () => {
    toggleStatusMock.mockClear();
    mockedUseAuth.mockReturnValue({ user: { id: 1 } as never, isLoading: false } as never);
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    const button = await screen.findByText("Хочу прочитать");
    await userEvent.click(button);

    expect(toggleStatusMock).toHaveBeenCalledWith("1", "want_to_read", expect.objectContaining({ title: "Великий Гэтсби" }));
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false } as never);
  });

  it("книга уже на полке → кнопка «Уже в плане»", async () => {
    mockedUseBookshelf.mockReturnValue({
      shelf: { "1": "want_to_read" },
      toggleStatus: toggleStatusMock,
    } as never);
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    expect(await screen.findByText("Уже в плане")).toBeTruthy();
    mockedUseBookshelf.mockReturnValue({ shelf: {}, toggleStatus: toggleStatusMock } as never);
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

  it("JSON-LD без aggregateRating (решение 14.08: риск спам-фильтра rich-результатов)", () => {
    const ld = buildBookJsonLd({
      title: "Великий Гэтсби",
      author: "Ф. Скотт Фицджеральд",
      coverImageUrl: "https://example.com/cover.jpg",
      description: "Роман, ставший символом века джаза.",
      genre: "Роман",
      publishedYear: 1925,
    });

    expect(ld["@type"]).toBe("Book");
    expect(ld.name).toBe("Великий Гэтсби");
    expect(ld.datePublished).toBe("1925");
    expect(ld).not.toHaveProperty("aggregateRating");
  });
});

describe("buildDescriptionSnippet", () => {
  it("короткое описание возвращает как есть", () => {
    expect(
      buildDescriptionSnippet({ title: "Дюна", author: "Фрэнк Герберт", description: "Роман о пустынной планете." }),
    ).toBe("Роман о пустынной планете.");
  });

  it("длинное описание обрезает по границе слова с многоточием", () => {
    const long = `Роман, ставший символом века джаза. ${"Далее длинный текст сюжета. ".repeat(10)}конец`;
    const result = buildDescriptionSnippet({ title: "Гэтсби", author: null, description: long });
    expect(result.length).toBeLessThanOrEqual(158);
    expect(result.endsWith("…")).toBe(true);
    expect(result.endsWith("…конец")).toBe(false);
  });

  it("без описания — fallback-шаблон с названием и автором", () => {
    expect(buildDescriptionSnippet({ title: "Дюна", author: "Фрэнк Герберт", description: null })).toBe(
      "Книга Дюна Фрэнк Герберт: описание, жанр, рейтинг. Найди книги в тир-листах и подборках BookStrata.",
    );
  });
});
