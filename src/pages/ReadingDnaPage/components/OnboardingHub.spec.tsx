import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnboardingHub } from "./OnboardingHub";
import * as readingDnaApi from "@/lib/readingDnaApi";

// Мокаем API близнецов
vi.mock("@/lib/readingDnaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/readingDnaApi")>();
  return {
    ...actual,
    getReadingTwins: vi.fn(),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("OnboardingHub", () => {
  it("отображает 6 интерактивных карточек возможностей платформы", () => {
    renderWithProviders(
      <OnboardingHub
        archetypeName="Архитектор смыслов"
        casteName="Орден Разума"
        theme="dark"
      />
    );

    expect(screen.getByText(/Создай свой тир-лист/i)).toBeInTheDocument();
    expect(screen.getByText(/Книжные рейтинги/i)).toBeInTheDocument();
    expect(screen.getByText(/Полки знаменитостей/i)).toBeInTheDocument();
    expect(screen.getByText(/Каталог авторов/i)).toBeInTheDocument();
    expect(screen.getByText(/Литературный блог/i)).toBeInTheDocument();
    expect(screen.getByText(/Частые вопросы/i)).toBeInTheDocument();
  });

  it("корректно отображает список книжных близнецов при их наличии", async () => {
    vi.mocked(readingDnaApi.getReadingTwins).mockResolvedValueOnce({
      twins: [
        {
          id: 1,
          ticketNumber: "BS-1111-A",
          archetype: "meaning-architect",
          archetypeName: "Архитектор смыслов",
          customName: "Северный Читатель",
          axes: {
            storyFocus: 40,
            emotionalWeight: 60,
            pace: 30,
            darkness: 50,
            scope: 70,
            complexity: 80,
          },
          favoriteBooks: [{ title: "Улисс" }],
          likedGenres: [],
          dislikedGenres: [],
          favoriteAuthors: [],
          viewsCount: 0,
          shareCount: 0,
          duelsCount: 0,
          theme: "dark",
          createdAt: new Date().toISOString(),
          similarity: 92,
        },
      ],
    });

    renderWithProviders(
      <OnboardingHub
        ticketNumber="BS-7492-X"
        archetypeName="Архитектор смыслов"
        casteName="Орден Разума"
        theme="dark"
      />
    );

    expect(await screen.findByText(/Северный Читатель/i)).toBeInTheDocument();
    expect(screen.getByText(/92% совместимость/i)).toBeInTheDocument();
  });

  it("показывает призыв стать первопроходцем, если близнецов пока нет", async () => {
    vi.mocked(readingDnaApi.getReadingTwins).mockResolvedValueOnce({
      twins: [],
    });

    renderWithProviders(
      <OnboardingHub
        ticketNumber="BS-7492-X"
        archetypeName="Архитектор смыслов"
        casteName="Орден Разума"
        theme="craft"
      />
    );

    expect(
      await screen.findByText(/Ты один из первых в своей касте/i)
    ).toBeInTheDocument();
  });
});
