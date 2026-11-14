import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookAutocompleteInput } from "./BookAutocompleteInput";
import * as bookApi from "@/lib/bookApi";

vi.mock("@/lib/bookApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bookApi")>("@/lib/bookApi");
  return {
    ...actual,
    searchCatalogBooks: vi.fn(),
  };
});

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("BookAutocompleteInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит поля ввода названия и автора", () => {
    renderWithClient(
      <BookAutocompleteInput
        value={{ title: "Дюна", author: "Фрэнк Герберт" }}
        onChange={vi.fn()}
        placeholderTitle="Название книги"
        theme="dark"
      />
    );

    expect(screen.getByPlaceholderText("Название книги")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Автор (необязательно)")).toBeInTheDocument();
  });

  it("вызывает onChange при ручном вводе названия", () => {
    const handleChange = vi.fn();
    renderWithClient(
      <BookAutocompleteInput
        value={{ title: "", author: "" }}
        onChange={handleChange}
        placeholderTitle="Название книги"
        theme="dark"
      />
    );

    const input = screen.getByPlaceholderText("Название книги");
    fireEvent.change(input, { target: { value: "1984" } });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: "1984" })
    );
  });

  it("отображает подсказки из каталога и позволяет выбрать книгу", async () => {
    const mockBooks = [
      {
        id: 42,
        title: "Мастер и Маргарита",
        author: "Михаил Булгаков",
        coverImageUrl: "/covers/master.jpg",
        slug: "master-i-margarita",
        rating: 4.8,
      },
    ];
    vi.mocked(bookApi.searchCatalogBooks).mockResolvedValue(mockBooks);

    const handleChange = vi.fn();
    renderWithClient(
      <BookAutocompleteInput
        value={{ title: "Мастер", author: "" }}
        onChange={handleChange}
        placeholderTitle="Название книги"
        theme="dark"
      />
    );

    // Вводим текст больше 2 символов
    const input = screen.getByPlaceholderText("Название книги");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Мастер" } });

    await waitFor(() => {
      expect(screen.getByText("Михаил Булгаков")).toBeInTheDocument();
    });

    // Кликаем по подсказке
    fireEvent.click(screen.getByText("Мастер и Маргарита"));

    expect(handleChange).toHaveBeenCalledWith({
      title: "Мастер и Маргарита",
      author: "Михаил Булгаков",
      bookId: 42,
      coverImageUrl: "/covers/master.jpg",
    });
  });

  it("отображает миниатюру обложки, если книга выбрана из каталога", () => {
    renderWithClient(
      <BookAutocompleteInput
        value={{
          title: "Дюна",
          author: "Фрэнк Герберт",
          bookId: 10,
          coverImageUrl: "/covers/dune.jpg",
        }}
        onChange={vi.fn()}
        placeholderTitle="Название книги"
        theme="dark"
      />
    );

    const img = screen.getByAltText("Дюна");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/covers/dune.jpg");
  });
});
