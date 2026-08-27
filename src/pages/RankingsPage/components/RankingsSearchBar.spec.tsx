/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RankingsSearchBar } from "./RankingsSearchBar";

vi.mock("@/hooks/useCatalogSearch", () => ({
  useCatalogSearch: () => ({
    query: "",
    setQuery: vi.fn(),
    results: [],
    isLoading: false,
    isOpen: false,
    setIsOpen: vi.fn(),
    activeIndex: -1,
    setActiveIndex: vi.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe("RankingsSearchBar", () => {
  it("рендерит инпут с placeholder", () => {
    renderWithProviders(<RankingsSearchBar />);
    expect(screen.getByPlaceholderText("Найти книгу...")).toBeInTheDocument();
  });

  it("имеет правильный aria-label", () => {
    renderWithProviders(<RankingsSearchBar />);
    expect(screen.getByLabelText("Поиск книг в каталоге")).toBeInTheDocument();
  });
});
