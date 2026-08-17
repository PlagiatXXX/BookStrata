// src/pages/AdminBooksPage/AdminBooksPage.test.tsx
// Админка каталога (Фаза 7): рендер таблицы с фильтрами, топ по
// просмотрам, открытие модалки редактирования, модалка комментариев,
// пагинация.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminBooksPage from "./AdminBooksPage";
import * as adminBooksApi from "@/lib/adminBooksApi";
import type { AdminBookListItem } from "@/lib/adminBooksApi";

// «Тяжёлые» общие компоненты — не относятся к админке книг
vi.mock("@/ui/Header", () => ({ Header: () => null }));
vi.mock("@/ui/Footer", () => ({ Footer: () => null }));
vi.mock("@/ui/MobileBottomNav", () => ({ MobileBottomNav: () => null }));

vi.mock("@/lib/adminBooksApi", () => ({
  listAdminBooks: vi.fn(),
  getAdminBook: vi.fn(),
  updateAdminBook: vi.fn(),
  publishAdminBook: vi.fn(),
  unpublishAdminBook: vi.fn(),
  enrichAdminBook: vi.fn(),
  mergeAdminBooks: vi.fn(),
  listAdminComments: vi.fn(),
  updateAdminComment: vi.fn(),
  deleteAdminComment: vi.fn(),
}));

const sileoMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sileo", () => ({ sileo: sileoMock }));

const bookRow: AdminBookListItem = {
  id: 10,
  title: "Анна Каренина",
  author: "Лев Толстой",
  slug: "anna-karenina-lev-tolstoj",
  status: "published",
  genre: "Роман",
  tags: ["классика"],
  coverImageUrl: "/cover.jpg",
  rating: 9.1,
  likesCount: 5,
  views: 42,
  publishedAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  mergedIntoId: null,
  source: "local",
  externalId: null,
  _count: { comments: 2 },
};

const bookDetail = {
  ...bookRow,
  authorId: 1,
  description: "Роман о любви и обществе.",
  publishedYear: 1877,
  isbn: null,
  contextChain: null,
  createdAt: "2025-01-01T00:00:00Z",
  authorRel: { name: "Лев Толстой" },
  slugHistory: [],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminBooksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockedList = vi.mocked(adminBooksApi.listAdminBooks);
const mockedDetail = vi.mocked(adminBooksApi.getAdminBook);
const mockedComments = vi.mocked(adminBooksApi.listAdminComments);
const mockedPublish = vi.mocked(adminBooksApi.publishAdminBook);
const mockedMerge = vi.mocked(adminBooksApi.mergeAdminBooks);
const mockedEnrich = vi.mocked(adminBooksApi.enrichAdminBook);
const mockedUpdate = vi.mocked(adminBooksApi.updateAdminBook);

describe("AdminBooksPage (Фаза 7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue({ items: [bookRow], total: 1 });
    mockedDetail.mockResolvedValue(bookDetail);
    mockedComments.mockResolvedValue({ items: [], total: 0 });
    mockedPublish.mockResolvedValue({ ...bookRow, status: "published" } as never);
    mockedMerge.mockResolvedValue({ ...bookRow } as never);
    mockedEnrich.mockResolvedValue({ updated: ["title"] });
    mockedUpdate.mockResolvedValue(bookDetail);
  });

  it("рендерит таблицу книг с просмотрами", async () => {
    renderPage();

    expect(await screen.findByText("Анна Каренина")).toBeInTheDocument();
    expect(screen.getByText(/Лев Толстой/)).toBeInTheDocument();
    // Просмотры из AnalyticsEvent — колонка в общей таблице
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 }),
    );
  });

  it("фильтр по статусу передаётся в API", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.selectOptions(screen.getByLabelText("Фильтр по статусу"), "draft");
    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "draft" }),
      );
    });
  });

  it("поиск по названию передаёт q в API", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.type(screen.getByPlaceholderText("Поиск по названию или автору…"), "толстой");

    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "толстой" }),
      );
    });
  });

  it("открывает модалку редактирования по кнопке", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.click(screen.getByRole("button", { name: "Редактировать" }));

    expect(await screen.findByText("«Погружение в контекст» (contextChain)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1877")).toBeInTheDocument();
  });

  it("клик по названию открывает модалку редактирования", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.click(
      screen.getByRole("button", { name: "Редактировать название: Анна Каренина" }),
    );

    expect(await screen.findByText("«Погружение в контекст» (contextChain)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1877")).toBeInTheDocument();
  });

  it("клик по обложке открывает модалку редактирования", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.click(
      screen.getByRole("button", { name: "Редактировать обложку: Анна Каренина" }),
    );

    expect(await screen.findByText("«Погружение в контекст» (contextChain)")).toBeInTheDocument();
  });

  it("кнопка «Опубликовать» вызывает publishAdminBook", async () => {
    const user = userEvent.setup();
    mockedList.mockResolvedValue({ items: [{ ...bookRow, status: "draft" }], total: 1 });
    mockedDetail.mockResolvedValue({ ...bookDetail, status: "draft" });
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.click(screen.getByRole("button", { name: "Редактировать" }));
    await user.click(await screen.findByRole("button", { name: "Опубликовать" }));

    await waitFor(() => {
      expect(mockedPublish).toHaveBeenCalledWith(10);
    });
  });

  it("«Сохранить» не закрывает редактор и показывает тост успеха", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.click(screen.getByRole("button", { name: "Редактировать" }));
    await user.click(await screen.findByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalled();
    });
    // Редактор остаётся открытым
    expect(screen.getByText("«Погружение в контекст» (contextChain)")).toBeInTheDocument();
    expect(sileoMock.success).toHaveBeenCalledWith({ title: "Изменения сохранены" });
  });

  it("«Опубликовать» закрывает редактор и показывает тост успеха", async () => {
    const user = userEvent.setup();
    mockedList.mockResolvedValue({ items: [{ ...bookRow, status: "draft" }], total: 1 });
    mockedDetail.mockResolvedValue({ ...bookDetail, status: "draft" });
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.click(screen.getByRole("button", { name: "Редактировать" }));
    await user.click(await screen.findByRole("button", { name: "Опубликовать" }));

    await waitFor(() => {
      expect(sileoMock.success).toHaveBeenCalledWith({ title: "Книга опубликована" });
    });
    // Редактор закрыт
    await waitFor(() => {
      expect(screen.queryByText("«Погружение в контекст» (contextChain)")).not.toBeInTheDocument();
    });
  });

  it("модалка комментариев открывается и показывает комментарии", async () => {
    const user = userEvent.setup();
    mockedComments.mockResolvedValue({
      items: [
        {
          id: 5,
          content: "Шедевр",
          likesCount: 3,
          editedAt: null,
          createdAt: "2026-01-01T00:00:00Z",
          parentId: null,
          book: { id: 10, title: "Анна Каренина", slug: "anna-karenina-lev-tolstoj" },
          user: { id: 2, username: "reader", avatarUrl: null },
        },
      ],
      total: 1,
    });
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.click(screen.getByRole("button", { name: /2/ }));

    expect(await screen.findByText("Шедевр")).toBeInTheDocument();
    expect(screen.getByText("reader")).toBeInTheDocument();
    expect(mockedComments).toHaveBeenCalledWith({ bookId: 10, limit: 100 });
  });

  it("merge: кнопка «Склеить с дублем…» открывает модалку и склеивает", async () => {
    const user = userEvent.setup();
    mockedList
      .mockResolvedValueOnce({ items: [bookRow], total: 1 })
      .mockResolvedValue({ items: [{ ...bookRow, id: 77, title: "Anna Karenina" }], total: 1 });
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.click(screen.getByRole("button", { name: "Редактировать" }));
    await user.click(await screen.findByRole("button", { name: "Склеить с дублем…" }));

    expect(await screen.findByText("Склейка дубля")).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText("Название книги-канона… (Enter)");
    await user.type(searchInput, "anna");
    await user.keyboard("{Enter}");

    const mergeBtn = await screen.findByRole("button", { name: "Склеить" });
    await user.click(mergeBtn);

    await waitFor(() => {
      expect(mockedMerge).toHaveBeenCalledWith(10, 77);
    });
  });

  it("merge: кандидат-сам-дубль скрыт из списка (защита от склейки с собой)", async () => {
    const user = userEvent.setup();
    mockedList
      .mockResolvedValueOnce({ items: [bookRow], total: 1 })
      .mockResolvedValue({ items: [bookRow, { ...bookRow, id: 77, title: "Anna Karenina" }], total: 2 });
    renderPage();
    await screen.findByText("Анна Каренина");

    await user.click(screen.getByRole("button", { name: "Редактировать" }));
    await user.click(await screen.findByRole("button", { name: "Склеить с дублем…" }));

    const searchInput = screen.getByPlaceholderText("Название книги-канона… (Enter)");
    await user.type(searchInput, "anna");
    await user.keyboard("{Enter}");

    // Кандидат с id дубля (10) скрыт, остаётся только 77
    const buttons = await screen.findAllByRole("button", { name: "Склеить" });
    expect(buttons).toHaveLength(1);

    await user.click(buttons[0]);
    await waitFor(() => {
      expect(mockedMerge).toHaveBeenCalledWith(10, 77);
    });
  });

  it("пагинация: «Вперёд» увеличивает offset", async () => {
    const user = userEvent.setup();
    mockedList.mockResolvedValue({ items: [], total: 120 });
    renderPage();
    await screen.findByText(/0 книг/);

    await user.click(screen.getByRole("button", { name: "Вперёд →" }));

    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 50 }),
      );
    });
  });
});
