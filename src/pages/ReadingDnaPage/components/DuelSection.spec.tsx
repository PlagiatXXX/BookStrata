import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DuelSection } from "./DuelSection";
import type { ReadingDnaResponseData, ReadingDnaDuelResultData } from "@/lib/readingDnaApi";

const mockMyTicket: ReadingDnaResponseData = {
  id: 1,
  ticketNumber: "BS-7492-A",
  customName: "Фёдор",
  archetype: "meaning-architect",
  archetypeName: "Архитектор смыслов",
  archetypeDesc: "Описание",
  motto: "Девиз",
  theme: "dark",
  axes: {
    storyFocus: 85,
    emotionalWeight: 80,
    pace: 70,
    darkness: 60,
    scope: 75,
    complexity: 90,
  },
  favoriteBooks: [
    { title: "Улисс", author: "Джеймс Джойс" },
    { title: "Игра в бисер", author: "Герман Гессе" },
    { title: "Имя розы", author: "Умберто Эко" },
  ],
  kryptoniteBook: { title: "Сумерки", author: "Стефани Майер" },
  likedGenres: ["Классика"],
  dislikedGenres: [],
  favoriteAuthors: [],
  shareUrl: "https://bookstrata.ru/reading-dna?ticket=BS-7492-A",
  shortCode: "7492A",
  viewsCount: 1,
  shareCount: 0,
  duelsCount: 0,
  createdAt: new Date().toISOString(),
};

const mockOpponentTicket: ReadingDnaResponseData = {
  id: 2,
  ticketNumber: "BS-3190-M",
  customName: "Маша",
  archetype: "truth-seeker",
  archetypeName: "Искатель истин",
  archetypeDesc: "Описание Маши",
  motto: "Девиз Маши",
  theme: "craft",
  axes: {
    storyFocus: 70,
    emotionalWeight: 75,
    pace: 60,
    darkness: 50,
    scope: 80,
    complexity: 85,
  },
  favoriteBooks: [
    { title: "1984", author: "Джордж Оруэлл" },
    { title: "Дюна", author: "Фрэнк Герберт" },
    { title: "Мы", author: "Евгений Замятин" },
  ],
  kryptoniteBook: null,
  likedGenres: ["Фантастика"],
  dislikedGenres: [],
  favoriteAuthors: [],
  shareUrl: "https://bookstrata.ru/reading-dna?ticket=BS-3190-M",
  shortCode: "3190M",
  viewsCount: 1,
  shareCount: 0,
  duelsCount: 0,
  createdAt: new Date().toISOString(),
};

const mockDuelResult: ReadingDnaDuelResultData = {
  compatibility: 84,
  verdict: "Литературные соулмейты (Абсолютный книжный резонанс)",
  targetTicketNumber: "BS-3190-M",
  breakdown: {
    axesSimilarity: 88,
    genreScore: 80,
    bookScore: 75,
    authorScore: 70,
    sharedDislikeBonus: 0,
    kryptoniteConflict: false,
    kryptonitePenalty: 0,
  },
};

describe("DuelSection", () => {
  it("если у пользователя нет билета — показывает заглушку с 3 шагами и кнопкой перехода к тесту", () => {
    const handleGoToTest = vi.fn();
    render(
      <DuelSection
        myTicket={null}
        theme="dark"
        onGoToTest={handleGoToTest}
      />
    );

    expect(screen.getByText(/Вход только по Читательскому билету/i)).toBeInTheDocument();
    expect(screen.getByText(/01 · Анкета/i)).toBeInTheDocument();
    expect(screen.getByText(/02 · Печать/i)).toBeInTheDocument();
    expect(screen.getByText(/03 · Сравнение/i)).toBeInTheDocument();

    const startBtn = screen.getByRole("button", { name: /Пройти тест и получить билет/i });
    fireEvent.click(startBtn);
    expect(handleGoToTest).toHaveBeenCalledTimes(1);
  });

  it("если у пользователя нет билета, но есть вызов от оппонента — показывает карточку вызова со скрытыми книгами", () => {
    const handleGoToTest = vi.fn();
    render(
      <DuelSection
        myTicket={null}
        opponentTicket={mockOpponentTicket}
        theme="dark"
        onGoToTest={handleGoToTest}
      />
    );

    expect(screen.getByText(/Маша предлагает сравнить вкусы!/i)).toBeInTheDocument();
    expect(screen.getByText(/3 Священные книги и Криптонит скрыты до сравнения вкусов/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Сравнить вкусы/i })).toBeInTheDocument();
  });

  it("если у пользователя есть билет — рендерит персональную ссылку-вызов и поле ввода номера билета друга", () => {
    render(
      <DuelSection
        myTicket={mockMyTicket}
        theme="dark"
        onGoToTest={vi.fn()}
      />
    );

    expect(screen.getByText(/СРАВНЕНИЕ ВКУСОВ С ДРУЗЬЯМИ/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Скопировать ссылку для сравнения/i })).toBeInTheDocument();
    expect(screen.getByText("BS-")).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/7492-A/i);
    const submitBtn = screen.getByRole("button", { name: /Сравнить вкусы/i });

    expect(input).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Вводим дефис и цифры
    fireEvent.change(input, { target: { value: "7492-" } });
    expect(input).toHaveValue("7492-");
    expect(submitBtn).toBeDisabled();

    // Пытаемся ввести цифру вместо буквы — цифра игнорируется
    fireEvent.change(input, { target: { value: "7492-5" } });
    expect(input).toHaveValue("7492-");
    expect(submitBtn).toBeDisabled();

    // Вводим букву — кнопка активируется
    fireEvent.change(input, { target: { value: "7492-B" } });
    expect(input).toHaveValue("7492-B");
    expect(submitBtn).not.toBeDisabled();

    // Удаляем букву и дефис через Backspace — значение свободно стирается
    fireEvent.change(input, { target: { value: "7492-" } });
    expect(input).toHaveValue("7492-");
    fireEvent.change(input, { target: { value: "7492" } });
    expect(input).toHaveValue("7492");
    fireEvent.change(input, { target: { value: "749" } });
    expect(input).toHaveValue("749");

    // Кнопка очистки полностью стирает инпут
    const clearBtn = screen.getByRole("button", { name: /Очистить поле/i });
    fireEvent.click(clearBtn);
    expect(input).toHaveValue("");
    expect(submitBtn).toBeDisabled();
  });

  it("если передан готовый результат сравнения — рендерит вердикт, процент, радар и раскрытые книги второго читателя", () => {
    render(
      <DuelSection
        myTicket={mockMyTicket}
        opponentTicket={mockOpponentTicket}
        initialDuelResult={mockDuelResult}
        theme="dark"
        onGoToTest={vi.fn()}
      />
    );

    expect(screen.getByText(/ИТОГ СРАВНЕНИЯ ВКУСОВ/i)).toBeInTheDocument();
    expect(screen.getByText("84%")).toBeInTheDocument();
    expect(screen.getByText(/Литературные соулмейты/i)).toBeInTheDocument();
    expect(screen.getByText(/Раскрытые книги второго читателя/i)).toBeInTheDocument();
    expect(screen.getByText("1984")).toBeInTheDocument();
    expect(screen.getByText("Дюна")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Поделиться в чате/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Сравнить с другим билетом/i })).toBeInTheDocument();
  });
});
