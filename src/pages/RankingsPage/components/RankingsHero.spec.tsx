/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RankingsHero } from "./RankingsHero";

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

function renderHero(onAiOpen = vi.fn()) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <RankingsHero onAiOpen={onAiOpen} />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("RankingsHero", () => {
  it("рендерит заголовок H1 и кнопку ИИ-помощника", () => {
    const onAiOpen = vi.fn();
    renderHero(onAiOpen);

    expect(screen.getByRole("heading", { level: 1, name: "Рейтинг книг" })).toBeInTheDocument();

    const aiButton = screen.getByRole("button", { name: /Спросить у Букстража/i });
    expect(aiButton).toBeInTheDocument();

    fireEvent.click(aiButton);
    expect(onAiOpen).toHaveBeenCalledTimes(1);
  });

  it("рендерит декоративный фон LCP через явный <img> с fetchPriority='high'", () => {
    const { container } = renderHero();

    const heroImg = container.querySelector('img[src*="hero-book3"]');
    expect(heroImg).toBeInTheDocument();
    expect(heroImg?.getAttribute("fetchpriority")).toBe("high");
    expect(heroImg?.getAttribute("aria-hidden")).toBe("true");
    expect(heroImg?.getAttribute("alt")).toBe("");
  });
});
