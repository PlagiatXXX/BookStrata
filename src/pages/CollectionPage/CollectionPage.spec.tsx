import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import CollectionPage from "./CollectionPage";

vi.mock("./hooks/useCollection", () => ({
  useCollection: vi.fn(),
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

import { useCollection } from "./hooks/useCollection";

function renderPage(slug = "horror-classics") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/collections/${slug}`]}>
        <HelmetProvider>
          <Routes>
            <Route path="/collections/:slug" element={<CollectionPage />} />
          </Routes>
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CollectionPage — обработка 404 и ошибок", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("404 от API (collection === null) → рендерит NotFoundPage без Soft-404 редиректа", async () => {
    vi.mocked(useCollection).mockReturnValue({
      collection: null,
      isLoading: false,
      isError: false,
    });

    renderPage("non-existent-collection");

    expect(await screen.findByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
  });

  it("ошибка сети (isError === true) → отображает экран ошибки с кнопкой повтора (не NotFoundPage)", async () => {
    vi.mocked(useCollection).mockReturnValue({
      collection: undefined,
      isLoading: false,
      isError: true,
    });

    renderPage("horror-classics");

    expect(await screen.findByText(/не удалось загрузить коллекцию/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /попробовать снова/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Страница не найдена" })).not.toBeInTheDocument();
  });
});
