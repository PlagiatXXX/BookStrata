import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminSubscriptionsPage from "./AdminSubscriptionsPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/lib/userApi", () => ({
  getAdminUsers: vi.fn(),
}));

vi.mock("@/lib/subscriptionsApi", () => ({
  getSubscriptionStats: vi.fn(),
  setProStatus: vi.fn(),
  activateProSubscription: vi.fn(),
}));

vi.mock("sileo", () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { getAdminUsers } from "@/lib/userApi";
import { getSubscriptionStats } from "@/lib/subscriptionsApi";

import type { AdminUser } from "@/types/auth";

const mockUsers: AdminUser[] = [
  {
    userId: 1,
    email: "pro@example.com",
    username: "prouser",
    isPro: true,
    isDonor: false,
    proExpiresAt: "2030-01-01T00:00:00.000Z",
    lastActivityAt: null,
    totalActiveMinutes: 120,
    role: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
    badges: [],
  },
  {
    userId: 2,
    email: "free@example.com",
    username: "freeuser",
    isPro: false,
    isDonor: false,
    proExpiresAt: null,
    lastActivityAt: null,
    totalActiveMinutes: 30,
    role: "user",
    createdAt: "2024-02-01T00:00:00.000Z",
    badges: [],
  },
];

const mockStats = {
  totalProUsers: 1,
  activeSubscriptions: 1,
  lifetimeSubscriptions: 0,
  expiringSoon: 0,
};

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminSubscriptionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminSubscriptionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminUsers).mockResolvedValue(mockUsers);
    vi.mocked(getSubscriptionStats).mockResolvedValue(mockStats);
  });

  it("рендерит заголовок, статистику и список пользователей", async () => {
    renderComponent();

    expect(screen.getByText("Управление подписками")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("prouser")).toBeInTheDocument();
      expect(screen.getByText("freeuser")).toBeInTheDocument();
      expect(screen.getByText("Всего Pro")).toBeInTheDocument();
    });
  });

  it("фильтрует пользователей по поисковому запросу", async () => {
    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("prouser")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Поиск по имени или email...");
    await user.type(searchInput, "free");

    expect(screen.queryByText("prouser")).not.toBeInTheDocument();
    expect(screen.getByText("freeuser")).toBeInTheDocument();
  });

  it("фильтрует пользователей по вкладкам статуса", async () => {
    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("prouser")).toBeInTheDocument();
      expect(screen.getByText("freeuser")).toBeInTheDocument();
    });

    const proButton = screen.getByRole("button", { name: /^pro$/i });
    await user.click(proButton);

    expect(screen.getByText("prouser")).toBeInTheDocument();
    expect(screen.queryByText("freeuser")).not.toBeInTheDocument();
  });

  it("кнопка «Назад в админку» вызывает навигацию", async () => {
    renderComponent();
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", { name: /назад в админку/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin");
  });
});
