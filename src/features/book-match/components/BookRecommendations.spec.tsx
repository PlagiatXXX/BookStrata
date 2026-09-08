import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Debounce → identity: тестируем рендер-логику, а не таймеры
vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: <T,>(value: T) => value,
}));

vi.mock("@/lib/matchApi", () => ({
  getMatchedBooks: vi.fn(),
  matchedBooksKey: (mood: Record<string, number | undefined>, limit: number, excludeSlug?: string) =>
    ["book-match", mood.storyFocus ?? null, mood.emotionalWeight ?? null, mood.pace ?? null, mood.darkness ?? null, limit, excludeSlug ?? null] as const,
}));

import { getMatchedBooks } from "@/lib/matchApi";
import { BookRecommendations } from "./BookRecommendations";

const mockGetMatchedBooks = vi.mocked(getMatchedBooks);

const BOOKS = [
  { id: 1, slug: "dark-book", title: "Тёмная", author: "Автор Тёмный", coverImageUrl: "/c/dark.jpg", score: 96 },
  { id: 2, slug: "mid-book", title: "Средняя", author: null, coverImageUrl: "/c/mid.jpg", score: 81 },
  { id: 3, slug: "light-book", title: "Светлая", author: "Автор Светлый", coverImageUrl: "/c/light.jpg", score: 72 },
];

function renderUi(props: { mood: Record<string, number | undefined>; excludeSlug?: string }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BookRecommendations mood={props.mood} excludeSlug={props.excludeSlug} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BookRecommendations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ничего не рендерит без активных осей", () => {
    const { container } = renderUi({ mood: {} });
    expect(container.firstChild).toBeNull();
    expect(mockGetMatchedBooks).not.toHaveBeenCalled();
  });

  it("рендерит карточки со ссылками, автором и score", async () => {
    mockGetMatchedBooks.mockResolvedValue(BOOKS);
    renderUi({ mood: { darkness: 90 } });

    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(3));

    const links = screen.getAllByRole("link") as HTMLAnchorElement[];
    expect(links[0].getAttribute("href")).toBe("/books/dark-book");
    expect(screen.getByText("Тёмная")).toBeDefined();
    expect(screen.getByText("Автор Тёмный")).toBeDefined();
    expect(screen.getByText("96%")).toBeDefined();
  });

  it("показывает скелетоны во время загрузки", async () => {
    mockGetMatchedBooks.mockReturnValue(new Promise(() => {})); // never resolves
    renderUi({ mood: { darkness: 90 } });

    await waitFor(() =>
      expect(screen.getAllByTestId("rec-skeleton")).toHaveLength(3),
    );
  });

  it("передаёт excludeSlug в DAO", async () => {
    mockGetMatchedBooks.mockResolvedValue(BOOKS);
    renderUi({ mood: { darkness: 90 }, excludeSlug: "current-book" });

    await waitFor(() => expect(mockGetMatchedBooks).toHaveBeenCalled());
    expect(mockGetMatchedBooks).toHaveBeenCalledWith(
      { darkness: 90 },
      3,
      "current-book",
    );
  });

  it("молча скрывает блок при ошибке", async () => {
    mockGetMatchedBooks.mockRejectedValue(new Error("network"));
    const { container } = renderUi({ mood: { darkness: 90 } });

    // Дожидаемся именно error-статуса (не просто вызова queryFn)
    await waitFor(() => expect(container.firstChild).toBeNull(), { timeout: 2000 });
  });
});
