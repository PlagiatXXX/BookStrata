/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import * as userApiModule from "@/lib/userApi";
import * as authContextModule from "@/hooks/useAuthContext";
import type { Mock } from "vitest";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

// Моки для хуков
vi.mock("@/lib/userApi", () => ({
  apiGetUserStats: vi.fn(),
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
  });

  it("должен рендериться с приветствием пользователя", () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    // Чип
    expect(screen.getByText("Панель управления")).toBeInTheDocument();
    // Имя пользователя в приветствии (текст разбит на h1 + span)
    expect(screen.getByText("Добро пожаловать,")).toBeInTheDocument();
    expect(screen.getByText("testuser")).toBeInTheDocument();
    // Кнопки
    expect(screen.getByText("Создать тир-лист")).toBeInTheDocument();
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

  it("должен переходить на страницу создания тир-листа при клике 'Создать тир-лист'", () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("Создать тир-лист"));

    expect(mockNavigate).toHaveBeenCalledWith("/templates");
  });

  it("должен переходить на страницу сообщества при клике 'Смотреть тренды'", () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("Смотреть тренды"));

    expect(mockNavigate).toHaveBeenCalledWith("/community");
  });
});
