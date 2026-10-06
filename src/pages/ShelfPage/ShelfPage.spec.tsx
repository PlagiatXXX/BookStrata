/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import ShelfPage from "./ShelfPage";

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useBookshelf", () => ({
  useBookshelf: vi.fn(),
}));

vi.mock("@/lib/shelfApi", () => ({
  fetchShelfBooks: vi.fn(async () => [
    {
      bookId: 42,
      status: "want_to_read" as const,
      book: {
        id: 42,
        title: "Дюна",
        author: "Фрэнк Герберт",
        coverImageUrl: "/duna.webp",
        genre: "Sci-Fi",
        description: "",
      },
    },
    {
      bookId: 43,
      status: "read" as const,
      book: {
        id: 43,
        title: "1984",
        author: "Джордж Оруэлл",
        coverImageUrl: "/1984.webp",
        genre: "",
        description: "",
      },
    },
  ]),
}));

vi.mock("sileo", () => ({
  sileo: { action: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/logger", () => {
  const m = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  return { default: m, createLogger: vi.fn(() => m) };
});

import { useAuth } from "@/hooks/useAuthContext";
import { useBookshelf } from "@/hooks/useBookshelf";

const GUEST_BOOKSHELF = {
  shelf: {
    "42": "want_to_read",
    "43": "read",
    "curated_7": "want_to_read",
  },
  slugShelf: {},
  guestBookMeta: {
    "42": { title: "Дюна", author: "Фрэнк Герберт", coverImageUrl: "/duna.webp" },
    "43": { title: "1984", author: "Джордж Оруэлл", coverImageUrl: "/1984.webp" },
    "curated_7": { title: "Солярис", author: "Станислав Лем", coverImageUrl: "" },
  },
  isLoading: false,
  totalCount: 3,
  readCount: 1,
  wantToReadCount: 2,
  toggleStatus: vi.fn(),
  setStatus: vi.fn(),
  removeStatus: vi.fn(),
  removeBooks: vi.fn(),
  clearShelf: vi.fn(),
  importLocalShelf: vi.fn(),
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe("ShelfPage — создание тир-листа", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("гость (неавторизован)", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
      } as unknown as ReturnType<typeof useAuth>);
      vi.mocked(useBookshelf).mockReturnValue(
        GUEST_BOOKSHELF as unknown as ReturnType<typeof useBookshelf>,
      );
    });

    it("кнопка «Создать тир-лист из «хочу прочитать»» ведёт в демо-редактор с параметрами полки", async () => {
      render(<ShelfPage />, { wrapper: createWrapper() });

      const btn = await screen.findByText(
        "Создать тир-лист из «хочу прочитать»",
      );
      fireEvent.click(btn);

      expect(mockNavigate).toHaveBeenCalledWith(
        "/tier-lists/new?from=shelf&section=want&title=" +
          encodeURIComponent("Хочу прочитать"),
      );
    });

    it("кнопка «Создать тир-лист из прочитанных» передаёт section=read", async () => {
      render(<ShelfPage />, { wrapper: createWrapper() });

      const btn = await screen.findByText("Создать тир-лист из прочитанных");
      fireEvent.click(btn);

      expect(mockNavigate).toHaveBeenCalledWith(
        "/tier-lists/new?from=shelf&section=read&title=" +
          encodeURIComponent("Моё прочитанное"),
      );
    });

    it("кнопка «Создать тир-лист из всей полки» передаёт section=all", async () => {
      render(<ShelfPage />, { wrapper: createWrapper() });

      const btn = await screen.findByText("Создать тир-лист из всей полки");
      fireEvent.click(btn);

      expect(mockNavigate).toHaveBeenCalledWith(
        "/tier-lists/new?from=shelf&section=all&title=" +
          encodeURIComponent("Вся моя полка"),
      );
    });
  });

  describe("авторизованный", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, username: "test" },
      } as unknown as ReturnType<typeof useAuth>);
      vi.mocked(useBookshelf).mockReturnValue({
        ...GUEST_BOOKSHELF,
        shelf: { "42": "want_to_read", "43": "read" },
        guestBookMeta: {},
      } as unknown as ReturnType<typeof useBookshelf>);
    });

    it("открывает модалку создания (существующее поведение не сломано)", async () => {
      render(<ShelfPage />, { wrapper: createWrapper() });

      const btn = await screen.findByText("Создать тир-лист из всей полки");
      fireEvent.click(btn);

      await waitFor(() => {
        expect(
          screen.getByText(/название|Название/i),
        ).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
