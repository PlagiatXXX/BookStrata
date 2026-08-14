// src/pages/BookPage/BookRatingPanel.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BookRatingPanel } from "./BookRatingPanel";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: "/books/velikij-getssbi" }),
  };
});

const useAuthMock = vi.fn(() => ({ user: { id: 1 } as { id: number } | null, isLoading: false }));
vi.mock("@/hooks/useAuthContext", () => ({ useAuth: () => useAuthMock() }));

const mutateMock = vi.fn();
vi.mock("@/hooks/useBookRating", () => ({
  useBookRatings: vi.fn(() => ({ data: { count: 12, averages: {}, overall: 7.1 } })),
  useMyBookRating: vi.fn(() => ({ data: null })),
  useRateBook: vi.fn(() => ({ mutate: mutateMock, isPending: false })),
}));

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BookRatingPanel bookId={42} defaultRating={8.4} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BookRatingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("стартует с редакционной оценкой по умолчанию и показывает среднюю читателей", () => {
    renderPanel();
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.value).toBe("8.4");
    expect(screen.getByText(/Средняя оценка/)).toBeTruthy();
    expect(screen.getByText(/7\.1/)).toBeTruthy();
    expect(screen.getByText(/12 голосов/)).toBeTruthy();
  });

  it("сохраняет оценку в localStorage и отправляет на сервер", async () => {
    renderPanel();
    const slider = screen.getByRole("slider") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "6.3" } });
    expect(screen.getByText("6.3")).toBeTruthy();

    fireEvent.click(screen.getByText("Поставить оценку"));
    expect(mutateMock).toHaveBeenCalledWith(6.3);
    expect(localStorage.getItem("book-rating:42")).toBe("6.3");
  });

  it("localStorage приоритетнее редакционной оценки при старте", () => {
    localStorage.setItem("book-rating:42", "5.5");
    renderPanel();
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.value).toBe("5.5");
  });

  it("без авторизации кнопка заблокирована и ведёт на /auth с redirect, оценка не отправляется", () => {
    useAuthMock.mockReturnValue({ user: null, isLoading: false });
    renderPanel();
    const lockedBtn = screen.getByText("Сначала войти");
    // Заблокированный вид: иконка замка + aria-disabled
    expect(lockedBtn.closest("button")?.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(lockedBtn);
    expect(navigateMock).toHaveBeenCalledWith("/auth?redirect=%2Fbooks%2Fvelikij-getssbi");
    expect(mutateMock).not.toHaveBeenCalled();
    useAuthMock.mockReturnValue({ user: { id: 1 }, isLoading: false });
  });

  it("после своей оценки кнопка предлагает изменить", async () => {
    renderPanel();
    const slider = screen.getByRole("slider") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "7.2" } });
    fireEvent.click(screen.getByText("Поставить оценку"));
    await waitFor(() => expect(localStorage.getItem("book-rating:42")).toBe("7.2"));
  });
});