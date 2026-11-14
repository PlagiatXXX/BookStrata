import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookChipInput } from "./BookChipInput";
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
    defaultOptions: { queries: { retry: false } },
  });
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

describe("BookChipInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит инпут названия книги и список уже выбранных книг в виде чипов", () => {
    const selected = [
      { title: "Преступление и наказание", author: "Ф. Достоевский" },
      { title: "Имя розы", author: "У. Эко" },
    ];

    renderWithClient(
      <BookChipInput
        books={selected}
        kryptonite={null}
        onChange={vi.fn()}
        theme="light"
      />
    );

    expect(screen.getByPlaceholderText(/Название книги/i)).toBeInTheDocument();
    expect(screen.getByText("Преступление и наказание")).toBeInTheDocument();
    expect(screen.getByText("Имя розы")).toBeInTheDocument();
  });

  it("добавляет произвольную книгу при нажатии Enter", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    renderWithClient(
      <BookChipInput
        books={[{ title: "Книга 1" }]}
        kryptonite={null}
        onChange={handleChange}
        theme="light"
      />
    );

    const input = screen.getByPlaceholderText(/Название книги/i);
    await user.type(input, "Дюна{Enter}");

    expect(handleChange).toHaveBeenCalledWith(
      [{ title: "Книга 1" }, { title: "Дюна" }],
      null
    );
  });

  it("добавляет произвольную книгу при клике на кнопку со стрелочкой", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    renderWithClient(
      <BookChipInput
        books={[{ title: "Книга 1" }]}
        kryptonite={null}
        onChange={handleChange}
        theme="light"
      />
    );

    const input = screen.getByPlaceholderText(/Название книги/i);
    await user.type(input, "1984");

    const submitBtn = screen.getByRole("button", { name: /Подтвердить добавление книги/i });
    expect(submitBtn).toBeInTheDocument();
    await user.click(submitBtn);

    expect(handleChange).toHaveBeenCalledWith(
      [{ title: "Книга 1" }, { title: "1984" }],
      null
    );
  });

  it("позволяет выбрать книгу из автокомплита каталога", async () => {
    vi.mocked(bookApi.searchCatalogBooks).mockResolvedValue([
      {
        id: 10,
        title: "Мастер и Маргарита",
        author: "Михаил Булгаков",
        coverImageUrl: "/covers/master.jpg",
        slug: "master",
        rating: 4.9,
      },
    ]);

    const handleChange = vi.fn();
    renderWithClient(
      <BookChipInput
        books={[]}
        kryptonite={null}
        onChange={handleChange}
        theme="dark"
      />
    );

    const input = screen.getByPlaceholderText(/Название книги/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Мастер" } });

    await waitFor(() => {
      expect(screen.getByText("Михаил Булгаков")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Мастер и Маргарита"));

    expect(handleChange).toHaveBeenCalledWith(
      [
        {
          title: "Мастер и Маргарита",
          author: "Михаил Булгаков",
          bookId: 10,
          coverImageUrl: "/covers/master.jpg",
        },
      ],
      null
    );
  });

  it("удаляет книгу при клике на крестик чипа", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    renderWithClient(
      <BookChipInput
        books={[
          { title: "Книга 1" },
          { title: "Книга 2" },
        ]}
        kryptonite={null}
        onChange={handleChange}
        theme="light"
      />
    );

    const removeBtns = screen.getAllByRole("button", { name: /✕/i });
    expect(removeBtns.length).toBe(2);

    await user.click(removeBtns[0]!);

    expect(handleChange).toHaveBeenCalledWith(
      [{ title: "Книга 2" }],
      null
    );
  });

  it("4-я добавленная книга автоматически становится криптонитом", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    renderWithClient(
      <BookChipInput
        books={[
          { title: "Книга 1" },
          { title: "Книга 2" },
          { title: "Книга 3" },
        ]}
        kryptonite={null}
        onChange={handleChange}
        theme="dark"
      />
    );

    const input = screen.getByPlaceholderText(/Название книги/i);
    await user.type(input, "Сумерки{Enter}");

    expect(handleChange).toHaveBeenCalledWith(
      [
        { title: "Книга 1" },
        { title: "Книга 2" },
        { title: "Книга 3" },
      ],
      { title: "Сумерки" }
    );
  });

  it("отображает разные заголовки и пояснения перед вводом каждой книги и криптонита", () => {
    // 0 книг: Главная святыня
    const { rerender } = renderWithClient(
      <BookChipInput
        books={[]}
        kryptonite={null}
        onChange={vi.fn()}
        theme="dark"
      />
    );
    expect(screen.getByText("Главная святыня")).toBeInTheDocument();
    expect(screen.getByText(/1 из 4/i)).toBeInTheDocument();

    // 1 книга: Любимый шедевр
    rerender(
      <BookChipInput
        books={[{ title: "Книга 1" }]}
        kryptonite={null}
        onChange={vi.fn()}
        theme="dark"
      />
    );
    expect(screen.getByText("Любимый шедевр")).toBeInTheDocument();
    expect(screen.getByText(/2 из 4/i)).toBeInTheDocument();

    // 2 книги: Личное сокровище
    rerender(
      <BookChipInput
        books={[{ title: "Книга 1" }, { title: "Книга 2" }]}
        kryptonite={null}
        onChange={vi.fn()}
        theme="dark"
      />
    );
    expect(screen.getByText("Личное сокровище")).toBeInTheDocument();
    expect(screen.getByText(/3 из 4/i)).toBeInTheDocument();

    // 3 книги: Криптонит
    rerender(
      <BookChipInput
        books={[{ title: "Книга 1" }, { title: "Книга 2" }, { title: "Книга 3" }]}
        kryptonite={null}
        onChange={vi.fn()}
        theme="dark"
      />
    );
    expect(screen.getByText("Личный криптонит ☠")).toBeInTheDocument();
    expect(screen.getByText(/4 из 4/i)).toBeInTheDocument();

    // 4 книги (все выбраны): итоговая плашка без дублирования инпута
    rerender(
      <BookChipInput
        books={[{ title: "Книга 1" }, { title: "Книга 2" }, { title: "Книга 3" }]}
        kryptonite={{ title: "Криптонит 1" }}
        onChange={vi.fn()}
        theme="dark"
      />
    );
    expect(screen.getByText("Все 4 книги выбраны")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Название книги/i)).not.toBeInTheDocument();
  });
});
