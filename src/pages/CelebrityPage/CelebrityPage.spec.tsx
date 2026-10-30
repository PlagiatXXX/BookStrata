import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import CelebrityPage from "./CelebrityPage";

vi.mock("@/lib/celebritiesApi", () => ({
  getCelebrityBySlug: vi.fn(),
  CELEBRITY_CATEGORIES: [],
}));

vi.mock("@/hooks/useBookshelf", () => ({
  useBookshelf: () => ({ shelf: {}, toggleBook: vi.fn() }),
}));

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

vi.mock("@/layouts/DashboardLayout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

import { getCelebrityBySlug } from "@/lib/celebritiesApi";

function renderPage(slug = "elon-musk") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/celebrities/${slug}`]}>
        <HelmetProvider>
          <Routes>
            <Route path="/celebrities/:slug" element={<CelebrityPage />} />
          </Routes>
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CelebrityPage — обработка 404 и ошибок", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("404 от API (celebrity === null) → рендерит NotFoundPage", async () => {
    vi.mocked(getCelebrityBySlug).mockResolvedValueOnce(null);

    renderPage("non-existent-celebrity");

    expect(await screen.findByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
  });

  it("ошибка сети → блок ошибки с повтором (не NotFoundPage)", async () => {
    vi.mocked(getCelebrityBySlug).mockRejectedValue(new Error("network failure"));

    renderPage("elon-musk");

    expect(await screen.findByText(/не удалось загрузить данные/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /попробовать снова/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Страница не найдена" })).not.toBeInTheDocument();
  });
});
