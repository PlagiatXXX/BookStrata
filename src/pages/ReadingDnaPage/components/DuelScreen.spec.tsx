import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DuelScreen } from "./DuelScreen";
import type { ReadingDnaResponseData, ReadingDnaDuelResultData } from "@/lib/readingDnaApi";

vi.mock("@/lib/readingDnaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/readingDnaApi")>();
  return {
    ...actual,
    getReadingTwins: vi.fn().mockResolvedValue({ twins: [] }),
  };
});

const sampleTargetTicket: ReadingDnaResponseData = {
  id: 1,
  ticketNumber: "BS-7492-X",
  customName: "Алиса",
  archetype: "dark-archivist",
  archetypeName: "Хранитель запретных фолиантов",
  archetypeDesc: "Тёмная классика и исследование бездны.",
  motto: "В тенях всегда скрыто больше правды.",
  theme: "dark",
  axes: {
    storyFocus: 65,
    emotionalWeight: 85,
    pace: 45,
    darkness: 90,
    scope: 55,
    complexity: 75,
  },
  favoriteBooks: [{ title: "1984" }, { title: "Франкенштейн" }, { title: "Дракула" }],
  kryptoniteBook: { title: "Сумерки" },
  likedGenres: ["Классика"],
  dislikedGenres: [],
  favoriteAuthors: [],
  viewsCount: 10,
  shareCount: 1,
  duelsCount: 3,
  createdAt: new Date().toISOString(),
};

function renderDuelScreen(props: {
  targetTicket?: ReadingDnaResponseData | null;
  onConductDuel?: (input: any) => Promise<ReadingDnaDuelResultData>;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DuelScreen
          targetTicket={props.targetTicket ?? sampleTargetTicket}
          onConductDuel={props.onConductDuel || vi.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DuelScreen", () => {
  it("отображает карточку вызова от целевого читателя с его номером билета и кастой", () => {
    renderDuelScreen({});

    expect(screen.getByText(/Литературный вызов/i)).toBeInTheDocument();
    expect(screen.getByText(/Алиса/i)).toBeInTheDocument();
    expect(screen.getAllByText(/BS-7492-X/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Хранитель запретных фолиантов")).toBeInTheDocument();
  });

  it("предлагает начать дуэль и проверить совместимость", () => {
    renderDuelScreen({});

    expect(
      screen.getByRole("button", { name: /Принять вызов/i })
    ).toBeInTheDocument();
  });

  it("проводит дуэль по номеру билета и показывает вердикт, процент и онбординг-хаб", async () => {
    const user = userEvent.setup();
    const mockDuel = vi.fn().mockResolvedValue({
      duelId: "duel-123",
      compatibility: 87,
      verdict: "Близкие по духу странники",
      sharedFavoriteBooks: ["1984"],
      conflictBooks: [],
    });

    renderDuelScreen({ onConductDuel: mockDuel });

    const input = screen.getByPlaceholderText(/Введи номер/i);
    await user.type(input, "BS-1111-A");

    const duelBtn = screen.getByRole("button", { name: /Сразиться/i });
    await user.click(duelBtn);

    expect(await screen.findByText("87%")).toBeInTheDocument();
    expect(screen.getByText("Близкие по духу странники")).toBeInTheDocument();
    expect(screen.getByText(/Что делать дальше на BookStrata/i)).toBeInTheDocument();
  });
});
