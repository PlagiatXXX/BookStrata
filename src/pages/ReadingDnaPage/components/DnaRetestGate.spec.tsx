import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DnaRetestGate } from "./DnaRetestGate";
import type { ReadingDnaResponseData } from "@/lib/readingDnaApi";

const mockTicket: ReadingDnaResponseData = {
  id: 1,
  ticketNumber: "BS-7492-X",
  customName: "Фёдор",
  archetype: "meaning-architect",
  archetypeName: "Архитектор смыслов",
  archetypeDesc: "Собирает структуру",
  motto: "Книга — архитектура мысли",
  theme: "dark",
  axes: {
    storyFocus: 85,
    emotionalWeight: 80,
    pace: 70,
    darkness: 60,
    scope: 75,
    complexity: 90,
  },
  favoriteBooks: [],
  likedGenres: [],
  dislikedGenres: [],
  favoriteAuthors: [],
  viewsCount: 10,
  shareCount: 2,
  duelsCount: 5,
  retestCount: 0,
  retestsLeft: 3,
  createdAt: "2026-11-20T10:00:00Z",
};

describe("DnaRetestGate", () => {
  it("рендерит информацию о запечатанном билете и доступных попытках", () => {
    render(
      <DnaRetestGate
        ticket={mockTicket}
        theme="dark"
        isGuest={false}
        onStartRetest={vi.fn()}
        onViewTicket={vi.fn()}
      />
    );

    expect(screen.getByText(/Читательский ДНК зафиксирован/i)).toBeInTheDocument();
    expect(screen.getByText(/#BS-7492-X/i)).toBeInTheDocument();
    expect(screen.getByText(/Архитектор смыслов/i)).toBeInTheDocument();
    expect(screen.getByText(/«Книга — архитектура мысли»/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Начать перекалибровку \(3 из 3\)/i })).toBeInTheDocument();
  });

  it("вызывает onStartRetest при нажатии на кнопку перекалибровки", async () => {
    const user = userEvent.setup();
    const onStartRetest = vi.fn();

    render(
      <DnaRetestGate
        ticket={mockTicket}
        theme="craft"
        isGuest={false}
        onStartRetest={onStartRetest}
        onViewTicket={vi.fn()}
      />
    );

    const retestBtn = screen.getByRole("button", { name: /Начать перекалибровку/i });
    await user.click(retestBtn);

    expect(onStartRetest).toHaveBeenCalledTimes(1);
  });

  it("вызывает onViewTicket при нажатии на кнопку перехода к билету", async () => {
    const user = userEvent.setup();
    const onViewTicket = vi.fn();

    render(
      <DnaRetestGate
        ticket={mockTicket}
        theme="craft"
        isGuest={false}
        onStartRetest={vi.fn()}
        onViewTicket={onViewTicket}
      />
    );

    const ticketBtn = screen.getByRole("button", { name: /Посмотреть мой билет/i });
    await user.click(ticketBtn);

    expect(onViewTicket).toHaveBeenCalledTimes(1);
  });

  it("для гостя требует вход в аккаунт и блокирует старт перекалибровки", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();

    render(
      <DnaRetestGate
        ticket={mockTicket}
        theme="craft"
        isGuest={true}
        onStartRetest={vi.fn()}
        onViewTicket={vi.fn()}
        onLogin={onLogin}
      />
    );

    expect(screen.getByText(/Требуется вход в аккаунт/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Начать перекалибровку/i })).not.toBeInTheDocument();

    const loginBtn = screen.getByRole("button", { name: /Войти для перекалибровки/i });
    await user.click(loginBtn);
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("при исчерпании всех 3 попыток блокирует перекалибровку и показывает сообщение", () => {
    const exhaustedTicket: ReadingDnaResponseData = {
      ...mockTicket,
      retestCount: 3,
      retestsLeft: 0,
    };

    render(
      <DnaRetestGate
        ticket={exhaustedTicket}
        theme="dark"
        isGuest={false}
        onStartRetest={vi.fn()}
        onViewTicket={vi.fn()}
      />
    );

    expect(screen.getByText(/Все 3 перекалибровки использованы/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Начать перекалибровку/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Посмотреть мой билет/i })).toBeInTheDocument();
  });
});
