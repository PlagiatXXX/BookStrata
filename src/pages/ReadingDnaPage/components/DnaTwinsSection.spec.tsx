import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DnaTwinsSection } from "./DnaTwinsSection";
import * as readingDnaApi from "@/lib/readingDnaApi";

vi.mock("@/lib/readingDnaApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/readingDnaApi")>(
    "@/lib/readingDnaApi"
  );
  return {
    ...actual,
    getReadingTwins: vi.fn(),
  };
});

function renderTwins(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DnaTwinsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("показывает пустое состояние, если близнецов пока нет", async () => {
    vi.mocked(readingDnaApi.getReadingTwins).mockResolvedValueOnce({ twins: [] });

    renderTwins(<DnaTwinsSection ticketNumber="BS-7492-A" theme="dark" />);

    expect(
      await screen.findByText(/Пока рядом по 6 осям никого не нашлось/i)
    ).toBeInTheDocument();
  });

  it("отображает книжного близнеца со ссылками на профиль, публичный тир-лист и сравнение вкусов", async () => {
    vi.mocked(readingDnaApi.getReadingTwins).mockResolvedValueOnce({
      twins: [
        {
          id: 2,
          ticketNumber: "BS-3190-M",
          customName: "Маша",
          archetype: "truth-seeker",
          archetypeName: "Искатель истин",
          theme: "craft",
          axes: {
            storyFocus: 70,
            emotionalWeight: 75,
            pace: 60,
            darkness: 50,
            scope: 80,
            complexity: 85,
          },
          favoriteBooks: [],
          likedGenres: [],
          dislikedGenres: [],
          favoriteAuthors: [],
          viewsCount: 1,
          shareCount: 0,
          duelsCount: 0,
          createdAt: "2026-11-21T10:00:00.000Z",
          similarity: 91,
          user: {
            id: 42,
            username: "masha_reads",
            avatarUrl: null,
          },
          topTierList: {
            id: "tl-1",
            slug: "top-scifi-2026",
            title: "Лучшая фантастика 2026",
          },
          publicTierListsCount: 2,
        },
      ],
    });

    renderTwins(<DnaTwinsSection ticketNumber="BS-7492-A" theme="craft" />);

    expect(await screen.findByText("Маша")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Профиль/i })).toHaveAttribute(
      "href",
      "/users/42"
    );
    expect(
      screen.getByRole("link", { name: /Лучшая фантастика 2026/i })
    ).toHaveAttribute("href", "/tier-lists/top-scifi-2026");
    expect(screen.getByRole("link", { name: /Сравнить/i })).toHaveAttribute(
      "href",
      "/reading-dna?challenge=BS-3190-M"
    );
  });
});
