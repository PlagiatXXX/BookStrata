import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfileDnaSection } from "./ProfileDnaSection";
import type { ReadingDnaResponseData } from "@/lib/readingDnaApi";

const sampleDna: ReadingDnaResponseData = {
  id: 1,
  ticketNumber: "BS-7492-X",
  customName: "Федя",
  archetype: "meaning-architect",
  archetypeName: "Архитектор смыслов",
  archetypeDesc: "Книга как инструмент познания мира.",
  motto: "Книга — инструмент познания",
  theme: "dark",
  axes: {
    storyFocus: 90,
    emotionalWeight: 80,
    pace: 75,
    darkness: 60,
    scope: 75,
    complexity: 90,
  },
  favoriteBooks: [],
  kryptoniteBook: null,
  likedGenres: ["Философия"],
  dislikedGenres: [],
  favoriteAuthors: [],
  shareUrl: "https://bookstrata.ru/reading-dna?ticket=BS-7492-X",
  shortCode: "7492",
  qrCodeUrl: null,
  ticketImageUrl: null,
  viewsCount: 10,
  shareCount: 2,
  duelsCount: 1,
  createdAt: "2026-11-13T10:00:00Z",
};

describe("ProfileDnaSection", () => {
  it("рендерит состояние загрузки при isLoading === true", () => {
    render(
      <MemoryRouter>
        <ProfileDnaSection dna={null} isLoading={true} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("dna-section-loading")).toBeInTheDocument();
  });

  it("при отсутствии ДНК рендерит карточку с предложением пройти тест", () => {
    render(
      <MemoryRouter>
        <ProfileDnaSection dna={null} isLoading={false} />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Читательский ДНК/i })).toBeInTheDocument();
    expect(screen.getByText(/Пройти тест/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Пройти тест/i });
    expect(link).toHaveAttribute("href", "/reading-dna");
  });

  it("при наличии ДНК отображает архетип, номер билета и ссылку на билет", () => {
    render(
      <MemoryRouter>
        <ProfileDnaSection dna={sampleDna} isLoading={false} />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Читательский ДНК/i })).toBeInTheDocument();
    expect(screen.getByText("Архитектор смыслов")).toBeInTheDocument();
    expect(screen.getByText(/BS-7492-X/)).toBeInTheDocument();

    const ticketLink = screen.getByRole("link", { name: /Открыть билет/i });
    expect(ticketLink).toHaveAttribute("href", "/reading-dna?ticket=BS-7492-X");
  });
});
