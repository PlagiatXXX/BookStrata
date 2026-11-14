import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProfilePage from "./index";

vi.mock("@/hooks/useAuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useUser", () => ({
  useUser: vi.fn(() => ({
    user: { id: 1, username: "reader123", email: "test@example.com" },
    stats: { tierListsCount: 5, booksRatedCount: 42, viewsCount: 100 },
    isLoading: false,
    uploadAvatar: vi.fn(),
  })),
}));
vi.mock("@/hooks/useAchievements", () => ({
  useAchievements: vi.fn(() => ({
    achievements: [],
    status: { completed: 0, total: 10 },
    isLoading: false,
  })),
}));
vi.mock("@/lib/readingDnaApi", () => ({
  getMyReadingDna: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/ui/Header", () => ({ Header: () => <div data-testid="mock-header" /> }));
vi.mock("@/ui/Footer", () => ({ Footer: () => <div data-testid="mock-footer" /> }));
vi.mock("@/ui/MobileBottomNav", () => ({ MobileBottomNav: () => null }));
vi.mock("./components/ProfileGenresSection", () => ({
  ProfileGenresSection: () => <div data-testid="genres-section" />,
}));
vi.mock("./components/AchievementsGrid", () => ({
  AchievementsGrid: () => <div data-testid="achievements-grid" />,
}));

import { useAuth } from "@/hooks/useAuthContext";

function renderProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ProfilePage — видимость секции ДНК", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("скрывает секцию ДНК для обычного пользователя (не админа)", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { userId: 1, username: "reader", role: "user" },
    } as unknown as ReturnType<typeof useAuth>);

    renderProfilePage();

    expect(screen.queryByLabelText(/Читательский ДНК/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("dna-section-loading")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Читательский ДНК/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Пройти тест/i)).not.toBeInTheDocument();
  });

  it("отображает секцию ДНК для администратора", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { userId: 1, username: "admin", role: "admin" },
    } as unknown as ReturnType<typeof useAuth>);

    renderProfilePage();

    expect(await screen.findByRole("heading", { name: /Читательский ДНК/i })).toBeInTheDocument();
  });

  it("отображает секцию ДНК для модератора", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { userId: 2, username: "mod", role: "moderator" },
    } as unknown as ReturnType<typeof useAuth>);

    renderProfilePage();

    expect(await screen.findByRole("heading", { name: /Читательский ДНК/i })).toBeInTheDocument();
  });
});
