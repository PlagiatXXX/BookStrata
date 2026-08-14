/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HeroSection } from "./HeroSection";
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

// 3D-книга не относится к тестируемому поведению
vi.mock("./BookScene/BookScene", () => ({
  default: () => <div data-testid="book-scene" />,
}));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function typeQuery(value: string) {
  const input = screen.getByPlaceholderText("Поиск читателя по нику...");
  fireEvent.change(input, { target: { value } });
  // Ждём debounce (300ms) + запас
  await sleep(400);
}

function renderHero() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("HeroSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it("должен показывать подсказку и не искать при пустом запросе", async () => {
    renderHero();

    expect(
      screen.getByText(/Введите минимум 2 символа/),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Поиск читателя по нику..."),
    ).toBeInTheDocument();

    await sleep(400);
    expect(userApiModule.apiSearchUsers).not.toHaveBeenCalled();
  });

  it("должен не вызывать api при запросе короче 2 символов", async () => {
    renderHero();

    await typeQuery("a");

    expect(userApiModule.apiSearchUsers).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Введите минимум 2 символа/),
    ).toBeInTheDocument();
  });

  it("должен вызывать apiSearchUsers с debounce при вводе 2+ символов", async () => {
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

    renderHero();
    await typeQuery("te");

    expect(await screen.findByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("Новичок")).toBeInTheDocument();
    expect(screen.getByText("100 XP")).toBeInTheDocument();

    expect(userApiModule.apiSearchUsers).toHaveBeenCalledWith("te");
  });

  it("должен показать 'Ничего не найдено' при пустом результате", async () => {
    (userApiModule.apiSearchUsers as any).mockResolvedValue([]);

    renderHero();
    await typeQuery("zz");

    expect(await screen.findByText("Ничего не найдено")).toBeInTheDocument();
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

    renderHero();
    await typeQuery("fed");

    expect(await screen.findByText("fedor")).toBeInTheDocument();

    const userCard = screen.getByText("fedor").closest("button")!;
    fireEvent.click(userCard);

    expect(mockNavigate).toHaveBeenCalledWith("/users/42");
  });

  it("должен очищать поле и возвращать подсказку при нажатии на крестик", async () => {
    (userApiModule.apiSearchUsers as any).mockResolvedValue([]);

    renderHero();
    await typeQuery("te");

    const input = screen.getByPlaceholderText(
      "Поиск читателя по нику...",
    ) as HTMLInputElement;

    const clearButton = screen.getByRole("button", { name: "Очистить поиск" });
    fireEvent.click(clearButton);

    expect(input.value).toBe("");
    expect(
      screen.getByText(/Введите минимум 2 символа/),
    ).toBeInTheDocument();
  });
});