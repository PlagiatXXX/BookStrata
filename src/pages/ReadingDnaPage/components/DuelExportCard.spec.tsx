import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DuelExportCard } from "./DuelExportCard";
import type { ReadingDnaResponseData, ReadingDnaDuelResultData } from "@/lib/readingDnaApi";

describe("DuelExportCard", () => {
  const myTicket: ReadingDnaResponseData = {
    id: 1,
    ticketNumber: "BS-1111-A",
    customName: "Алексей",
    archetype: "truth-seeker",
    archetypeName: "Искатель истин",
    archetypeDesc: "",
    motto: null,
    theme: "craft",
    axes: {
      storyFocus: 80,
      emotionalWeight: 75,
      pace: 60,
      darkness: 50,
      scope: 70,
      complexity: 85,
    },
    favoriteBooks: [{ title: "Имя розы", author: "Умберто Эко" }],
    kryptoniteBook: null,
    likedGenres: [],
    dislikedGenres: [],
    favoriteAuthors: [],
    shareUrl: "",
    shortCode: "1111A",
    viewsCount: 1,
    shareCount: 0,
    duelsCount: 0,
    createdAt: new Date().toISOString(),
  };

  const duelResult: ReadingDnaDuelResultData = {
    compatibility: 87,
    verdict: "Литературные соулмейты",
    targetTicketNumber: "BS-2222-B",
    breakdown: {
      axesSimilarity: 88,
      genreScore: 10,
      bookScore: 15,
      authorScore: 10,
      sharedDislikeBonus: 0,
      kryptoniteConflict: false,
      kryptonitePenalty: 0,
    },
  };

  it("рендерит процент совместимости, вердикт и радар в формате обычной карточки", () => {
    render(
      <DuelExportCard
        format="card"
        myTicket={myTicket}
        opponent={null}
        opponentTicketNumber="BS-2222-B"
        duelResult={duelResult}
        theme="craft"
      />
    );

    expect(screen.getByText("87%")).toBeInTheDocument();
    expect(screen.getByText("Литературные соулмейты")).toBeInTheDocument();
    expect(screen.getByText(/Алексей/i)).toBeInTheDocument();
    expect(screen.getByText(/BS-2222-B/i)).toBeInTheDocument();
  });

  it("рендерит Stories формат (540×960) с плашкой конфликта при kryptoniteConflict", () => {
    const conflictResult: ReadingDnaDuelResultData = {
      ...duelResult,
      compatibility: 35,
      verdict: "Криптонит-конфликт",
      breakdown: {
        ...duelResult.breakdown,
        kryptoniteConflict: true,
      },
    };

    render(
      <DuelExportCard
        format="stories"
        myTicket={myTicket}
        opponent={null}
        opponentTicketNumber="BS-9999-Z"
        duelResult={conflictResult}
        conflictBookTitle="Сумерки"
        theme="dark"
      />
    );

    expect(screen.getByText("35%")).toBeInTheDocument();
    expect(screen.getAllByText(/Криптонит-конфликт/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Сумерки/i)).toBeInTheDocument();
  });
});
