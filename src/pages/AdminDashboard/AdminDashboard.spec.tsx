import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/adminStatsApi", () => ({
  getAdminDashboardStats: vi.fn(),
}));

import { useAuth } from "@/hooks/useAuthContext";
import { getAdminDashboardStats } from "@/lib/adminStatsApi";

const mockStats = {
  totalUsers: 150,
  tierLists: 45,
  activeNews: 12,
  violators: 2,
  feedbackCount: 5,
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
        <AdminDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        userId: 1,
        username: "admin",
        role: "admin",
      },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshUser: vi.fn(),
      loginWithData: vi.fn(),
    });
    vi.mocked(getAdminDashboardStats).mockResolvedValue(mockStats as any);
  });

  it("рендерит заголовок админ-панели и карточку «Подписки» в активном состоянии", async () => {
    renderComponent();

    expect(screen.getByText("Админ-панель")).toBeInTheDocument();
    expect(screen.getByText("Подписки")).toBeInTheDocument();

    const subscriptionsBtn = screen.getByRole("button", { name: /подписки/i });
    expect(subscriptionsBtn).not.toHaveClass("opacity-50");
  });

  it("клик по карточке «Подписки» выполняет навигацию на /admin/subscriptions", async () => {
    renderComponent();
    const user = userEvent.setup();

    const subscriptionsBtn = screen.getByRole("button", { name: /подписки/i });
    await user.click(subscriptionsBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/subscriptions");
  });

  it("отображает быструю статистику админа", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("45")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
    });
  });
});
