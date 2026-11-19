import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SimilarTierListsCarousel } from "./SimilarTierListsCarousel";
import type { TierListShort } from "@/lib/tierListApi";

const mockSimilar: TierListShort[] = [
  {
    id: "tl-1",
    slug: "classic-sci-fi",
    title: "Классическая научная фантастика",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
    isPublic: true,
    coverImageUrl: "https://example.com/cover1.webp",
    authorName: "Айзек",
    likesCount: 12,
    booksCount: 8,
  },
];

function renderCarousel(tierListId: string, initialSimilar?: TierListShort[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SimilarTierListsCarousel tierListId={tierListId} initialSimilar={initialSimilar} />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe("SimilarTierListsCarousel", () => {
  it("не рендерится для нового несохраненного тир-листа tierListId='new'", () => {
    const { container } = renderCarousel("new", mockSimilar);
    expect(container).toBeEmptyDOMElement();
  });

  it("не рендерится, если список похожих пуст", () => {
    const { container } = renderCarousel("123", []);
    expect(container).toBeEmptyDOMElement();
  });

  it("рендерится в центрированном контейнере с relative z-10 и отображает заголовок и карточки", () => {
    renderCarousel("123", mockSimilar);

    const heading = screen.getByRole("heading", { name: /Похожие тир-листы/i });
    expect(heading).toBeInTheDocument();

    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section).toHaveClass("relative", "z-10", "max-w-450", "mx-auto");

    expect(screen.getByText("Классическая научная фантастика")).toBeInTheDocument();
    expect(screen.getByText("Айзек")).toBeInTheDocument();
  });
});
