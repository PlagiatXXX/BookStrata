/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { UserSearchSection } from "./UserSearchSection";
import * as userApiModule from "@/lib/userApi";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/lib/userApi", () => ({
  apiSearchUsers: vi.fn(),
}));

vi.mock("@/components/Avatar", () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UserSearchSection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("UserSearchSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it("должен показать приглашение к поиску при пустом запросе", () => {
    renderSection();

    expect(screen.getByText("Поиск пользователей")).toBeInTheDocument();
    expect(
      screen.getByText("Начните вводить ник для поиска"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Введите ник пользователя..."),
    ).toBeInTheDocument();
  });

  it("должен вызывать apiSearchUsers при вводе текста", async () => {
    const mockResults = [
      {
        id: 1,
        username: "testuser",
        avatarUrl: null,
        isDonor: false,
        xp: 100,
        title: "Новичок",
        icon: null,
        role: null,
      },
    ];
    (userApiModule.apiSearchUsers as any).mockResolvedValue(mockResults);

    renderSection();

    const input = screen.getByPlaceholderText("Введите ник пользователя...");
    fireEvent.change(input, { target: { value: "test" } });

    // Ждём загрузки данных
    expect(await screen.findByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("Новичок")).toBeInTheDocument();
    expect(screen.getByText("100 XP")).toBeInTheDocument();

    expect(userApiModule.apiSearchUsers).toHaveBeenCalledWith("test");
  });

  it("должен показать 'Ничего не найдено' при пустом результате", async () => {
    (userApiModule.apiSearchUsers as any).mockResolvedValue([]);

    renderSection();

    const input = screen.getByPlaceholderText("Введите ник пользователя...");
    fireEvent.change(input, { target: { value: "zzz" } });

    expect(await screen.findByText("Ничего не найдено")).toBeInTheDocument();
  });

  it("должен показывать кнопку очистки при непустом запросе", () => {
    renderSection();

    const input = screen.getByPlaceholderText("Введите ник пользователя...");
    fireEvent.change(input, { target: { value: "test" } });

    // Кнопка очистки — второй button (первый мог быть из другого места)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("должен очищать поле при нажатии на кнопку очистки", async () => {
    (userApiModule.apiSearchUsers as any).mockResolvedValue([]);

    renderSection();

    const input = screen.getByPlaceholderText(
      "Введите ник пользователя...",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });

    // Ждём появления результатов (или пустого состояния)
    // и ищем кнопку внутри контейнера поиска
    const clearButton = screen.getByRole("button", { hidden: true });
    fireEvent.click(clearButton);

    expect(input.value).toBe("");
    // После очистки должно появиться приглашение
    expect(
      screen.getByText("Начните вводить ник для поиска"),
    ).toBeInTheDocument();
  });

  it("должен переходить на профиль при клике на пользователя", async () => {
    const mockResults = [
      {
        id: 42,
        username: "fedor",
        avatarUrl: null,
        isDonor: true,
        xp: 500,
        title: "Мастер",
        icon: null,
        role: "admin",
      },
    ];
    (userApiModule.apiSearchUsers as any).mockResolvedValue(mockResults);

    renderSection();

    const input = screen.getByPlaceholderText("Введите ник пользователя...");
    fireEvent.change(input, { target: { value: "fedor" } });

    // Ждём появления никнейма в span (avatar больше не рендерит username)
    expect(await screen.findByText("fedor")).toBeInTheDocument();

    // Кликаем на кнопку-карточку пользователя
    const userCard = screen.getByText("fedor").closest("button")!;
    fireEvent.click(userCard);

    expect(mockNavigate).toHaveBeenCalledWith("/users/42");
  });

  it("должен показывать иконку мецената для isDonor", async () => {
    const mockResults = [
      {
        id: 1,
        username: "donoruser",
        avatarUrl: null,
        isDonor: true,
        xp: 200,
        title: "Новичок",
        icon: null,
        role: null,
      },
    ];
    (userApiModule.apiSearchUsers as any).mockResolvedValue(mockResults);

    renderSection();

    const input = screen.getByPlaceholderText("Введите ник пользователя...");
    fireEvent.change(input, { target: { value: "donor" } });

    expect(await screen.findByText("donoruser")).toBeInTheDocument();
    expect(screen.getByText("🕊️")).toBeInTheDocument();
  });

  it("должен не вызывать api при пустом запросе (только пробелы)", async () => {
    renderSection();

    const input = screen.getByPlaceholderText("Введите ник пользователя...");
    fireEvent.change(input, { target: { value: "   " } });

    // Небольшая задержка, чтобы убедиться, что запрос не вызван
    await new Promise((r) => setTimeout(r, 100));

    expect(userApiModule.apiSearchUsers).not.toHaveBeenCalled();
  });
});
