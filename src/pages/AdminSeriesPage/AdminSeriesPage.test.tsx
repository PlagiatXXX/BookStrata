import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminSeriesPage from "./AdminSeriesPage";

const listAdminSeriesMock = vi.fn();
const createAdminSeriesMock = vi.fn();
const updateAdminSeriesMock = vi.fn();
const deleteAdminSeriesMock = vi.fn();
const listAdminAuthorsMock = vi.fn();

vi.mock("@/lib/seriesApi", () => ({
  listAdminSeries: (...args: unknown[]) => listAdminSeriesMock(...args),
  createAdminSeries: (...args: unknown[]) => createAdminSeriesMock(...args),
  updateAdminSeries: (...args: unknown[]) => updateAdminSeriesMock(...args),
  deleteAdminSeries: (...args: unknown[]) => deleteAdminSeriesMock(...args),
}));

vi.mock("@/lib/adminAuthorsApi", () => ({
  listAdminAuthors: (...args: unknown[]) => listAdminAuthorsMock(...args),
}));

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminSeriesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminSeriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAdminSeriesMock.mockResolvedValue({
      items: [
        {
          id: 1,
          name: "Ведьмак",
          slug: "vedmak",
          description: "Сага о Геральте",
          coverImageUrl: null,
          authorId: 7,
          author: { id: 7, name: "Анджей Сапковский", slug: "andzhej-sapkovskij" },
          _count: { books: 2 },
          createdAt: "2026-11-28T00:00:00.000Z",
          updatedAt: "2026-11-28T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
    });
    listAdminAuthorsMock.mockResolvedValue({
      authors: [
        {
          id: 7,
          name: "Анджей Сапковский",
          slug: "andzhej-sapkovskij",
          statsCount: 0,
          showcaseCount: 0,
          adaptationsCount: 0,
          pressQuotesCount: 0,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it("рендерит таблицу циклов с автором, slug и количеством книг", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Ведьмак")).toBeInTheDocument();
    });
    expect(screen.getByText("Анджей Сапковский")).toBeInTheDocument();
    expect(screen.getByText("/series/vedmak")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("блокирует удаление цикла с привязанными книгами", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Удалить Ведьмак")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Удалить Ведьмак"));

    expect(
      screen.getByText(/Нельзя удалить цикл «Ведьмак»: привязано книг — 2/),
    ).toBeInTheDocument();
    expect(deleteAdminSeriesMock).not.toHaveBeenCalled();
  });

  it("создаёт новый цикл с выбором автора из autocomplete", async () => {
    createAdminSeriesMock.mockResolvedValue({
      id: 2,
      name: "Дюна",
      slug: "dyuna",
      description: null,
      coverImageUrl: null,
      authorId: 7,
      author: { id: 7, name: "Анджей Сапковский", slug: "andzhej-sapkovskij" },
      _count: { books: 0 },
      createdAt: "2026-11-28T00:00:00.000Z",
      updatedAt: "2026-11-28T00:00:00.000Z",
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Новый цикл")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Новый цикл"));
    fireEvent.change(screen.getByPlaceholderText("Например: Ведьмак"), {
      target: { value: "Дюна" },
    });

    const authorInput = screen.getByLabelText("Автор цикла");
    fireEvent.focus(authorInput);
    fireEvent.change(authorInput, { target: { value: "Сапковский" } });

    await waitFor(() => {
      expect(listAdminAuthorsMock).toHaveBeenCalled();
    });

    const option = await screen.findByText("andzhej-sapkovskij");
    fireEvent.mouseDown(option);

    fireEvent.click(screen.getByRole("button", { name: "Создать" }));

    await waitFor(() => {
      expect(createAdminSeriesMock).toHaveBeenCalled();
    });
    expect(createAdminSeriesMock.mock.calls[0][0]).toEqual({
      name: "Дюна",
      description: null,
      coverImageUrl: null,
      authorId: 7,
    });
  });
});
