import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DuelSection } from "./DuelSection";
import type { ReadingDnaResponseData, ReadingDnaDuelResultData } from "@/lib/readingDnaApi";
import * as readingDnaApi from "@/lib/readingDnaApi";

const { mockToPng } = vi.hoisted(() => ({
  mockToPng: vi.fn().mockResolvedValue("data:image/png;base64,fake"),
}));

vi.mock("html-to-image", () => ({
  toPng: mockToPng,
}));

vi.mock("sileo", () => ({
  sileo: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/readingDnaApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/readingDnaApi")>("@/lib/readingDnaApi");
  return {
    ...actual,
    getReadingCelebrities: vi.fn().mockResolvedValue([]),
    conductCelebrityDuel: vi.fn(),
  };
});

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

  beforeEach(() => {
    mockToPng.mockClear();
  });

  it("если передан готовый результат сравнения — рендерит вердикт, процент, радар, книги и кнопки экспорта PNG / Stories", async () => {
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
    expect(screen.getAllByText("84%").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Литературные соулмейты/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Раскрытые книги второго читателя/i)).toBeInTheDocument();
    expect(screen.getByText("1984")).toBeInTheDocument();
    expect(screen.getByText("Дюна")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Поделиться в чате/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Сравнить с другим билетом/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Все сравнения и знаменитости/i })).toBeInTheDocument();

    const pngBtn = screen.getByRole("button", { name: /Скачать карточку \(PNG\)/i });
    const storiesBtn = screen.getByRole("button", { name: /Для Stories \(9:16\)/i });
    expect(pngBtn).toBeInTheDocument();
    expect(storiesBtn).toBeInTheDocument();

    fireEvent.click(pngBtn);
    await waitFor(() => {
      expect(mockToPng).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ width: 600, height: 760, pixelRatio: 2 })
      );
    });

    fireEvent.click(storiesBtn);
    await waitFor(() => {
      expect(mockToPng).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ width: 540, height: 960, pixelRatio: 2 })
      );
    });
  });

  it("при нажатии на кнопку возврата в хаб сбрасывает карточку и вызывает onResetDuel", () => {
    const onReset = vi.fn();
    render(
      <DuelSection
        myTicket={mockMyTicket}
        opponentTicket={mockOpponentTicket}
        initialDuelResult={mockDuelResult}
        theme="dark"
        onGoToTest={vi.fn()}
        onResetDuel={onReset}
      />
    );

    const backBtn = screen.getByRole("button", { name: /Все сравнения и знаменитости/i });
    fireEvent.click(backBtn);

    expect(onReset).toHaveBeenCalled();
    expect(screen.queryByText(/ИТОГ СРАВНЕНИЯ ВКУСОВ/i)).not.toBeInTheDocument();
    expect(screen.getByText(/СРАВНЕНИЕ ВКУСОВ С ДРУЗЬЯМИ/i)).toBeInTheDocument();
  });

  it("при криптонит-конфликте отображает плашку конфликта и название конфликтной книги", () => {
    const conflictOpponent: ReadingDnaResponseData = {
      ...mockOpponentTicket,
      kryptoniteBook: { title: "Имя розы", author: "Умберто Эко" },
    };
    const conflictResult: ReadingDnaDuelResultData = {
      ...mockDuelResult,
      compatibility: 31,
      verdict: "Взрывоопасная смесь: ваша любимая книга — криптонит оппонента!",
      breakdown: {
        ...mockDuelResult.breakdown,
        kryptoniteConflict: true,
        kryptonitePenalty: 25,
      },
    };

    render(
      <DuelSection
        myTicket={mockMyTicket}
        opponentTicket={conflictOpponent}
        initialDuelResult={conflictResult}
        theme="dark"
        onGoToTest={vi.fn()}
      />
    );

    expect(screen.getAllByText(/Криптонит-конфликт.*−25%.*Имя розы/i).length).toBeGreaterThan(0);
  });

  it("показывает реальных знаменитостей и проводит дуэль в 1 клик с раскрытием криптонита", async () => {
    const celeb = {
      id: 7,
      slug: "stephen-king",
      name: "Стивен Кинг",
      photoUrl: "",
      category: "writer",
      focalX: 50,
      focalY: 50,
      archetype: "abyss-archivist",
      archetypeName: "Архивариус Бездны",
      motto: "Тьма честнее света",
      axes: { storyFocus: 70, emotionalWeight: 80, pace: 55, darkness: 90, scope: 60, complexity: 75 },
      favoriteBooks: [
        { title: "Повелитель мух" },
        { title: "Кровавый меридиан" },
        { title: "1984" },
      ],
      kryptoniteBook: { title: "Сумерки" },
      likedGenres: ["Ужасы"],
      favoriteAuthors: ["Уильям Голдинг"],
      booksCount: 8,
    };

    vi.mocked(readingDnaApi.getReadingCelebrities).mockResolvedValueOnce([celeb]);
    vi.mocked(readingDnaApi.conductCelebrityDuel).mockResolvedValueOnce({
      compatibility: 78,
      verdict: "Книжные единомышленники",
      breakdown: {
        axesSimilarity: 82,
        genreScore: 50,
        bookScore: 0,
        authorScore: 0,
        sharedDislikeBonus: 0,
        kryptoniteConflict: false,
        kryptonitePenalty: 0,
      },
      celebrity: celeb,
    });

    render(
      <DuelSection
        myTicket={mockMyTicket}
        theme="dark"
        onGoToTest={vi.fn()}
      />
    );

    const celebBtn = await screen.findByRole("button", { name: /Стивен Кинг/i });
    fireEvent.click(celebBtn);

    expect(await screen.findAllByText("78%")).toBeTruthy();
    expect(screen.getByText(/Криптонит \(последняя книга тир-листа\):/i)).toBeInTheDocument();
    expect(screen.getByText("Сумерки")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Открыть полку знаменитости/i })).toHaveAttribute(
      "href",
      "/celebrities/stephen-king"
    );
  });
});
