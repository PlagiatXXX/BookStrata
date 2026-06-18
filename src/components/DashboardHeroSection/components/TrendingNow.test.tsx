import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ExternalNewsItem } from "@/lib/externalNewsApi";

// Мокаем внешние модули
vi.mock("@/lib/externalNewsApi", () => ({
  getExternalNews: vi.fn(),
}));

// Мокаем useQuery из react-query
const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

// Need to mock the CSS import
vi.mock("./TrendingNow.css", () => ({}));

import { TrendingNow } from "./TrendingNow";

const fakeNews: ExternalNewsItem[] = [
  {
    id: "1",
    title: "Новость 1",
    url: "https://example.com/1",
    source: "Source1",
    imageUrl: null,
    excerpt: "Описание 1",
    lang: "ru",
    publishedAt: "2026-06-18",
  },
  {
    id: "2",
    title: "Новость 2",
    url: "https://example.com/2",
    source: "Source2",
    imageUrl: null,
    excerpt: "Описание 2",
    lang: "ru",
    publishedAt: "2026-06-18",
  },
];

describe("TrendingNow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит ссылку /community#news вместо кнопки", () => {
    mockUseQuery.mockReturnValue({
      data: fakeNews,
      isLoading: false,
    });

    render(<TrendingNow />);

    const link = screen.getByRole("link", { name: /все новости/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/community#news");
  });

  it("возвращает null при isLoading", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<TrendingNow />);
    expect(container.innerHTML).toBe("");
  });

  it("возвращает null при пустом массиве новостей", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { container } = render(<TrendingNow />);
    expect(container.innerHTML).toBe("");
  });

  it("рендерит заголовок секции", () => {
    mockUseQuery.mockReturnValue({
      data: fakeNews,
      isLoading: false,
    });

    render(<TrendingNow />);
    expect(screen.getByText("Сейчас обсуждают")).toBeInTheDocument();
  });

  it("рендерит карточки новостей", () => {
    mockUseQuery.mockReturnValue({
      data: fakeNews,
      isLoading: false,
    });

    render(<TrendingNow />);
    expect(screen.getByText("Новость 1")).toBeInTheDocument();
    expect(screen.getByText("Новость 2")).toBeInTheDocument();
  });

  it("не рендерит кнопку (раньше был navigate)", () => {
    mockUseQuery.mockReturnValue({
      data: fakeNews,
      isLoading: false,
    });

    render(<TrendingNow />);

    // В компоненте не должно быть <button>
    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);
  });
});
