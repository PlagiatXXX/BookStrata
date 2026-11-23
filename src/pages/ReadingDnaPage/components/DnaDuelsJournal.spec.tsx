import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DnaDuelsJournal } from "./DnaDuelsJournal";
import * as readingDnaApi from "@/lib/readingDnaApi";

vi.mock("@/lib/readingDnaApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/readingDnaApi")>(
    "@/lib/readingDnaApi"
  );
  return {
    ...actual,
    getTicketDuels: vi.fn(),
  };
});

function renderJournal(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DnaDuelsJournal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("отображает пустое состояние и кнопку копирования ссылки-вызова, когда дуэлей ещё нет", async () => {
    vi.mocked(readingDnaApi.getTicketDuels).mockResolvedValueOnce({
      totalDuels: 0,
      bestMatch: null,
      mainAntagonist: null,
      recentDuels: [],
    });

    const onCopy = vi.fn();
    renderJournal(
      <DnaDuelsJournal
        ticketNumber="BS-7492-A"
        theme="dark"
        onCopyChallengeLink={onCopy}
      />
    );

    expect(screen.getByText(/История читательских дуэлей/i)).toBeInTheDocument();
    expect(await screen.findByText(/Пока нет ни одного сравнения вкуса/i)).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: /Скопировать ссылку-вызов/i });
    fireEvent.click(copyBtn);
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("отображает лучшее совпадение, главного антагониста с криптонит-конфликтом и список последних сравнений", async () => {
    vi.mocked(readingDnaApi.getTicketDuels).mockResolvedValueOnce({
      totalDuels: 2,
      bestMatch: {
        id: 1,
        opponentName: "Маша",
        opponentTicketNumber: "BS-1111-A",
        opponentArchetypeName: "Искатель истин",
        compatibility: 92,
        verdict: "Литературные соулмейты",
        kryptoniteConflict: false,
        createdAt: "2026-11-21T10:00:00.000Z",
      },
      mainAntagonist: {
        id: 2,
        opponentName: "Игорь",
        opponentTicketNumber: "BS-2222-B",
        opponentArchetypeName: "Архивариус Бездны",
        compatibility: 24,
        verdict: "Полярные противоположности",
        kryptoniteConflict: true,
        createdAt: "2026-11-21T11:00:00.000Z",
      },
      recentDuels: [
        {
          id: 2,
          opponentName: "Игорь",
          opponentTicketNumber: "BS-2222-B",
          opponentArchetypeName: "Архивариус Бездны",
          compatibility: 24,
          verdict: "Полярные противоположности",
          kryptoniteConflict: true,
          createdAt: "2026-11-21T11:00:00.000Z",
        },
        {
          id: 1,
          opponentName: "Маша",
          opponentTicketNumber: "BS-1111-A",
          opponentArchetypeName: "Искатель истин",
          compatibility: 92,
          verdict: "Литературные соулмейты",
          kryptoniteConflict: false,
          createdAt: "2026-11-21T10:00:00.000Z",
        },
      ],
    });

    renderJournal(<DnaDuelsJournal ticketNumber="BS-7492-A" theme="craft" />);

    expect(await screen.findByText(/Лучшее совпадение/i)).toBeInTheDocument();
    expect(screen.getByText(/Главный антагонист/i)).toBeInTheDocument();
    expect(screen.getAllByText("Маша").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Игорь").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("92%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("24%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Криптонит-конфликт/i)).toBeInTheDocument();
    expect(screen.getByText(/Последние сравнения/i)).toBeInTheDocument();
  });

  it("корректно отображает бейджи направления (исходящая и входящая дуэль) и заголовок для чужого билета", async () => {
    vi.mocked(readingDnaApi.getTicketDuels).mockResolvedValueOnce({
      totalDuels: 2,
      bestMatch: {
        id: 10,
        direction: "outgoing",
        opponentName: "Сергей",
        opponentTicketNumber: "BS-3333-C",
        opponentArchetypeName: "Книжный исследователь",
        compatibility: 85,
        verdict: "Отличный тандем",
        kryptoniteConflict: false,
        createdAt: "2026-11-22T10:00:00.000Z",
      },
      mainAntagonist: null,
      recentDuels: [
        {
          id: 10,
          direction: "outgoing",
          opponentName: "Сергей",
          opponentTicketNumber: "BS-3333-C",
          opponentArchetypeName: "Книжный исследователь",
          compatibility: 85,
          verdict: "Отличный тандем",
          kryptoniteConflict: false,
          createdAt: "2026-11-22T10:00:00.000Z",
        },
        {
          id: 11,
          direction: "incoming",
          opponentName: "Анна",
          opponentTicketNumber: "BS-4444-D",
          opponentArchetypeName: "Хранитель традиций",
          compatibility: 70,
          verdict: "Хорошее пересечение",
          kryptoniteConflict: false,
          createdAt: "2026-11-22T12:00:00.000Z",
        },
      ],
    });

    renderJournal(
      <DnaDuelsJournal ticketNumber="BS-7492-A" isOtherTicket={true} theme="dark" />
    );

    const sergeyElements = await screen.findAllByText("Сергей");
    expect(sergeyElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/История сравнений с этим билетом/i)).toBeInTheDocument();
    expect(screen.getAllByText(/вы вызвали/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/вызов вам/i)).toBeInTheDocument();
    expect(screen.getByText("Анна")).toBeInTheDocument();
  });
});
