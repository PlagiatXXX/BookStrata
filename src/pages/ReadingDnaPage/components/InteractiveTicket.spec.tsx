import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InteractiveTicket } from "./InteractiveTicket";
import type { ReadingDnaResponseData } from "@/lib/readingDnaApi";

vi.mock("@/lib/readingDnaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/readingDnaApi")>();
  return {
    ...actual,
    getReadingTwins: vi.fn().mockResolvedValue({ twins: [] }),
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

describe("InteractiveTicket", () => {
  const sampleTicket: ReadingDnaResponseData = {
    id: 1,
    ticketNumber: "BS-7492-X",
    customName: "Алиса",
    archetype: "dark-archivist",
    archetypeName: "Хранитель запретных фолиантов",
    archetypeDesc: "Ищет катарсис через исследование бездны человеческой природы.",
    motto: "В тенях всегда скрыто больше правды, чем при ярком дневном свете.",
    theme: "dark",
    axes: {
      storyFocus: 65,
      emotionalWeight: 85,
      pace: 45,
      darkness: 90,
      scope: 55,
      complexity: 75,
    },
    favoriteBooks: [
      { title: "1984", author: "Оруэлл" },
      { title: "Франкенштейн", author: "Шелли" },
      { title: "Дракула", author: "Стокер" },
    ],
    kryptoniteBook: { title: "Сумерки", author: "Майер" },
    likedGenres: ["Классика", "Хоррор"],
    dislikedGenres: ["Любовный роман"],
    favoriteAuthors: ["По", "Лавкрафт"],
    shareUrl: "https://bookstrata.ru/reading-dna?ticket=BS-7492-X",
    viewsCount: 10,
    shareCount: 2,
    duelsCount: 1,
    createdAt: new Date().toISOString(),
  };

  it("рендерит номер билета, имя владельца, архетип и цитату", () => {
    renderWithProviders(<InteractiveTicket ticket={sampleTicket} onRetake={vi.fn()} />);

    expect(screen.getByText(/BS-7492-X/i)).toBeInTheDocument();
    expect(screen.getByText("Алиса")).toBeInTheDocument();
    expect(screen.getAllByText("Хранитель запретных фолиантов").length).toBeGreaterThan(0);
    expect(screen.getByText(/В тенях всегда скрыто больше правды/i)).toBeInTheDocument();
  });

  it("отображает 3 святыни и криптонит", () => {
    renderWithProviders(<InteractiveTicket ticket={sampleTicket} onRetake={vi.fn()} />);

    expect(screen.getByText("1984")).toBeInTheDocument();
    expect(screen.getByText("Франкенштейн")).toBeInTheDocument();
    expect(screen.getByText("Дракула")).toBeInTheDocument();
    expect(screen.getByText("Сумерки")).toBeInTheDocument();
  });

  it("предоставляет кнопки шеринга и вызова на дуэль", () => {
    renderWithProviders(<InteractiveTicket ticket={sampleTicket} onRetake={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Поделиться/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Бросить вызов/i })).toBeInTheDocument();
  });

  it("отображает персональный QR-код для дуэли", () => {
    const { container } = renderWithProviders(
      <InteractiveTicket ticket={sampleTicket} onRetake={vi.fn()} />
    );

    expect(screen.getByText("QR ДУЭЛИ")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
