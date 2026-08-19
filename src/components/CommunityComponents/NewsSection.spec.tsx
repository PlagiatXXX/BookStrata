// src/components/CommunityComponents/NewsSection.spec.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { NewsSection } from "./NewsSection";
import { getPublishedNews } from "@/lib/newsApi";

vi.mock("@/lib/newsApi", () => ({
  getPublishedNews: vi.fn(),
}));

const mockNews = [
  {
    id: "1",
    title: "Новая подборка хорроров",
    excerpt: "Десять книг, от которых мурашки",
    imageUrl: "https://example.com/cover1.jpg",
    tags: ["Хоррор"],
    authorId: null,
    publishedAt: "2026-08-01T12:00:00Z",
    isPublished: true,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "2",
    title: "Без обложки",
    excerpt: "Эта новость без картинки",
    imageUrl: null,
    tags: [],
    authorId: null,
    publishedAt: "2026-08-02T12:00:00Z",
    isPublished: true,
    createdAt: "2026-08-02T10:00:00Z",
    updatedAt: "2026-08-02T10:00:00Z",
  },
];

function renderNewsSection() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NewsSection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NewsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("показывает обложку в карточке новости, если она есть", async () => {
    vi.mocked(getPublishedNews).mockResolvedValue(mockNews);
    renderNewsSection();

    const img = await screen.findByAltText("Новая подборка хорроров");
    expect(img).toHaveAttribute("src", "https://example.com/cover1.jpg");
  });

  it("не показывает обложку, если у новости её нет", async () => {
    vi.mocked(getPublishedNews).mockResolvedValue(mockNews);
    renderNewsSection();

    expect(await screen.findByText("Без обложки")).toBeTruthy();
    expect(screen.queryAllByRole("img")).toHaveLength(1);
  });
});
