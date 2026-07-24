/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import TemplateLibrary from "./TemplateLibrary";
import * as tierListApiModule from "@/lib/tierListApi";
import * as authContextModule from "../../hooks/useAuthContext";
import type { PaginatedTierListsResponse } from "@/lib/tierListApi";

vi.mock("@/lib/tierListApi", () => ({
  getUserTierLists: vi.fn(),
  getPublicTierLists: vi.fn(),
  getLikedTierLists: vi.fn(),
}));

vi.mock("../../hooks/useAuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockPublicTierLists: PaginatedTierListsResponse = {
  data: [
    {
      id: "1",
      title: "Public Tier List 1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      isPublic: true,
      user: { id: 1, username: "user1" },
      likesCount: 5,
    },
  ],
  meta: {
    totalItems: 1,
    itemCount: 1,
    itemsPerPage: 6,
    totalPages: 1,
    currentPage: 1,
  },
};

const mockPrivateTierLists: PaginatedTierListsResponse = {
  data: [
    {
      id: "p1",
      title: "My Private List",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      isPublic: false,
      user: { id: 1, username: "testuser" },
      likesCount: 0,
    },
  ],
  meta: {
    totalItems: 1,
    itemCount: 1,
    itemsPerPage: 100,
    totalPages: 1,
    currentPage: 1,
  },
};

const mockLikedTierLists: PaginatedTierListsResponse = {
  data: [
    {
      id: "l1",
      title: "Liked List",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      isPublic: true,
      user: { id: 2, username: "otheruser" },
      likesCount: 10,
    },
  ],
  meta: {
    totalItems: 1,
    itemCount: 1,
    itemsPerPage: 100,
    totalPages: 1,
    currentPage: 1,
  },
};

const createWrapper = (initialEntries = ["/templates"]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe("TemplateLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: { userId: 1, username: "testuser", avatarUrl: null },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.mocked(tierListApiModule.getPublicTierLists).mockResolvedValue(
      mockPublicTierLists,
    );
    vi.mocked(tierListApiModule.getUserTierLists).mockResolvedValue(
      mockPrivateTierLists,
    );
    vi.mocked(tierListApiModule.getLikedTierLists).mockResolvedValue(
      mockLikedTierLists,
    );
  });

  it("должен рендериться с заголовком Тир-листы", () => {
    render(<TemplateLibrary />, { wrapper: createWrapper() });

    const heading = screen.getByRole("heading", { name: "Тир-листы" });
    expect(heading).toBeInTheDocument();
  });

  it("должен показывать навигацию по секциям", () => {
    render(<TemplateLibrary />, { wrapper: createWrapper() });

    const sectionNames = ["Личные тир-листы", "Популярные", "Избранное"];
    for (const name of sectionNames) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it("должен отображать личные тир-листы в секции private", async () => {
    render(<TemplateLibrary />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Private List")).toBeInTheDocument();
    });
  });

  it("должен переключаться на публичные тир-листы", async () => {
    render(<TemplateLibrary />, { wrapper: createWrapper() });

    const publicBtn = screen.getByText("Популярные");
    fireEvent.click(publicBtn);

    await waitFor(() => {
      expect(screen.getByText("Public Tier List 1")).toBeInTheDocument();
    });
  });

  it("должен переключаться на избранное", async () => {
    render(<TemplateLibrary />, { wrapper: createWrapper() });

    const favBtn = screen.getAllByText("Избранное")[0];
    fireEvent.click(favBtn);

    await waitFor(() => {
      expect(screen.getByText("Liked List")).toBeInTheDocument();
    });
  });

  it("должен показывать сообщение когда нет личных тир-листов", async () => {
    vi.mocked(tierListApiModule.getUserTierLists).mockResolvedValue({
      data: [],
      meta: { totalItems: 0, itemCount: 0, itemsPerPage: 100, totalPages: 0, currentPage: 1 },
    });

    render(<TemplateLibrary />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("У вас еще нет тир-листов")).toBeInTheDocument();
    });
  });

  it("должен читать секцию из URL search params", async () => {
    render(<TemplateLibrary />, {
      wrapper: createWrapper(["/templates?section=public"]),
    });

    await waitFor(() => {
      expect(screen.getByText("Public Tier List 1")).toBeInTheDocument();
    });
  });
});
