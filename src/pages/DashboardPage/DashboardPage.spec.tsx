/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import DashboardPage from "./DashboardPage";
import * as userApiModule from "@/lib/userApi";
import * as authContextModule from "@/hooks/useAuthContext";
import type { Mock } from "vitest";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

// Моки для хуков
vi.mock("@/lib/userApi", () => ({
  apiGetUserStats: vi.fn(),
  apiGetMyTierLists: vi.fn(),
  apiGetMyBooks: vi.fn(),
}));

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useAiLibrarian", () => ({
  useAiLibrarian: vi.fn(() => ({
    messages: [],
    isStreaming: false,
    streamingContent: "",
    error: null,
    status: "online",
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
    refreshStatus: vi.fn(),
  })),
}));

vi.mock("@/hooks/useBodyScrollLock", () => ({
  useBodyScrollLock: vi.fn(),
}));

vi.mock("@/lib/logger", () => {
  const m = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  return { default: m, createLogger: vi.fn(() => m) };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Мокаем useAuth
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: {
        userId: 1,
        username: "testuser",
        avatarUrl: null,
      },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    // Мокаем статистику
    vi.mocked(userApiModule.apiGetUserStats as Mock).mockResolvedValue({
      tierListsCount: 2,
      publishedCount: 1,
      likesCount: 15,
      templatesCount: 0,
      likesTodayCount: 0,
      totalBooks: 10,
      lastActivity: new Date().toISOString(),
    });

    // Мокаем свои тир-листы
    vi.mocked(userApiModule.apiGetMyTierLists as Mock).mockResolvedValue({
      data: [
        {
          id: "1",
          title: "Мой публичный",
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          booksCount: 5,
        },
        {
          id: "2",
          title: "Мой черновик",
          isPublic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          booksCount: 3,
        },
      ],
      meta: { totalItems: 2, itemCount: 2, itemsPerPage: 100, totalPages: 1, currentPage: 1 },
    });

    // Мокаем свои книги
    vi.mocked(userApiModule.apiGetMyBooks as Mock).mockResolvedValue([
      {
        id: 1,
        title: "Книга 1",
        author: "Автор 1",
        coverImageUrl: "",
        description: null,
        genre: null,
        tags: [],
        tierListId: "1",
        tierListTitle: "Мой публичный",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        title: "Книга 2",
        author: "Автор 2",
        coverImageUrl: "",
        description: null,
        genre: null,
        tags: [],
        tierListId: "2",
        tierListTitle: "Мой черновик",
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  it("должен рендериться с приветствием пользователя", () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    // Чип
    expect(screen.getByText("Панель управления")).toBeInTheDocument();
    // Имя пользователя в приветствии (текст разбит на h1 + span)
    expect(screen.getByText("Добро пожаловать,")).toBeInTheDocument();
    expect(screen.getByText("testuser")).toBeInTheDocument();
    // Кнопки
    expect(screen.getByText("В библиотеку")).toBeInTheDocument();
    expect(screen.getByText("Смотреть тренды")).toBeInTheDocument();
  });

  it("должен показывать AI Librarian карточку", () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Букстраж")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("должен рендериться без пользователя (isLoading) без ошибок", () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<DashboardPage />, { wrapper: createWrapper() });

    // Страница не падает, приветствие без username
    expect(screen.getByText("Панель управления")).toBeInTheDocument();
  });

  it("должен открывать AI Librarian модалку при клике на карточку", async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    // Кликаем по карточке "Букстраж"
    fireEvent.click(screen.getByText("Букстраж"));

    // Модалка открывается — проверяем наличие заголовка
    await waitFor(() => {
      expect(screen.getByText("BookStrata AI")).toBeInTheDocument();
    });
  });

  it("должен переходить в библиотеку при клике 'В библиотеку'", () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("В библиотеку"));

    expect(mockNavigate).toHaveBeenCalledWith("/templates");
  });

  it("должен переходить на страницу сообщества при клике 'Смотреть тренды'", () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("Смотреть тренды"));

    expect(mockNavigate).toHaveBeenCalledWith("/community");
  });

  it("должен показывать тир-листы при клике на 'Создано тир-листов'", async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("Создано тир-листов"));

    await waitFor(() => {
      expect(screen.getByText("Все тир-листы")).toBeInTheDocument();
      expect(screen.getByText("Мой публичный")).toBeInTheDocument();
      expect(screen.getByText("Мой черновик")).toBeInTheDocument();
    });
  });

  it("должен показывать только публичные при клике на 'Опубликовано'", async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("Опубликовано"));

    await waitFor(() => {
      expect(screen.getByText("Опубликованные тир-листы")).toBeInTheDocument();
      expect(screen.getByText("Мой публичный")).toBeInTheDocument();
      expect(screen.queryByText("Мой черновик")).not.toBeInTheDocument();
    });
  });

  it("должен показывать только черновики при клике на 'Черновики'", async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getAllByText("Черновики")[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Черновики").length).toBe(2); // label + section title
      expect(screen.queryByText("Мой публичный")).not.toBeInTheDocument();
      expect(screen.getByText("Мой черновик")).toBeInTheDocument();
    });
  });

  it("должен скрывать тир-листы при повторном клике", async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    // Первый клик — показываем
    fireEvent.click(screen.getByText("Создано тир-листов"));
    await waitFor(() => {
      expect(screen.getByText("Все тир-листы")).toBeInTheDocument();
    });

    // Второй клик — скрываем
    fireEvent.click(screen.getByText("Создано тир-листов"));
    await waitFor(() => {
      expect(screen.queryByText("Все тир-листы")).not.toBeInTheDocument();
    });
  });

  it("должен показывать книги при клике на 'Книг в подборках'", async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("Книг в подборках"));

    await waitFor(() => {
      expect(screen.getByText("Все книги в подборках")).toBeInTheDocument();
      expect(screen.getByText("Книга 1")).toBeInTheDocument();
      expect(screen.getByText("Книга 2")).toBeInTheDocument();
    });
  });

  it("должен показывать сообщение при пустом списке книг", async () => {
    vi.mocked(userApiModule.apiGetMyBooks as Mock).mockResolvedValue([]);

    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("Книг в подборках"));

    await waitFor(() => {
      expect(screen.getByText("Книги не найдены")).toBeInTheDocument();
    });
  });

  it("должен скрывать книги при клике 'Скрыть все' в секции книг", async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("Книг в подборках"));
    await waitFor(() => {
      expect(screen.getByText("Книга 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Скрыть все"));
    expect(screen.queryByText("Книга 1")).not.toBeInTheDocument();
    expect(screen.getByText("Развернуть")).toBeInTheDocument();
  });

  it("должен показывать книги обратно при клике 'Развернуть'", async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("Книг в подборках"));
    await waitFor(() => {
      expect(screen.getByText("Книга 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Скрыть все"));
    expect(screen.queryByText("Книга 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Развернуть"));
    expect(screen.getByText("Книга 1")).toBeInTheDocument();
  });

  it("должен сбрасывать showBooks при закрытии и открытии секции книг", async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    // Открываем книги, скрываем
    fireEvent.click(screen.getByText("Книг в подборках"));
    await waitFor(() => {
      expect(screen.getByText("Книга 1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Скрыть все"));
    expect(screen.queryByText("Книга 1")).not.toBeInTheDocument();

    // Закрываем секцию книг (повторный клик)
    fireEvent.click(screen.getByText("Книг в подборках"));
    await waitFor(() => {
      expect(screen.queryByText("Все книги в подборках")).not.toBeInTheDocument();
    });

    // Открываем снова — книги должны быть развёрнуты
    fireEvent.click(screen.getByText("Книг в подборках"));
    await waitFor(() => {
      expect(screen.getByText("Книга 1")).toBeInTheDocument();
      expect(screen.getByText("Скрыть все")).toBeInTheDocument();
    });
  });
});
