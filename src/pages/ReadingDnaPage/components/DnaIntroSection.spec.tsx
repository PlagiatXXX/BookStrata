import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { DnaIntroSection } from "./DnaIntroSection";
import type { DnaArchetypeCatalogItem } from "@/lib/readingDnaApi";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

const mockArchetypes: DnaArchetypeCatalogItem[] = [
  {
    id: "meaning-architect",
    number: 1,
    caste: {
      id: "mind",
      name: "Орден Смыслов",
      sealColor: "#c0c0c8",
      badgeClass: "",
    },
    rarity: 7,
    names: {
      dark: "Архитектор смыслов",
      craft: "Искатель сути",
    },
    description: "Интеллектуальная проза и философские романы.",
    quote: "Книга — это препарирование реальности",
    specialSign: "Любит скрытые метафоры",
    axisRanges: {
      storyFocus: { min: 80, max: 100 },
      emotionalWeight: { min: 70, max: 90 },
      pace: { min: 60, max: 85 },
      darkness: { min: 50, max: 70 },
      scope: { min: 65, max: 85 },
      complexity: { min: 80, max: 100 },
    },
  },
  {
    id: "forbidden-archivist",
    number: 5,
    caste: {
      id: "abyss",
      name: "Орден Бездны",
      sealColor: "#8a2433",
      badgeClass: "",
    },
    rarity: 8,
    names: {
      dark: "Хранитель запретных фолиантов",
      craft: "Полуночный затворник",
    },
    description: "Тёмная классика и нуар.",
    quote: "Тьма внутри нас",
    specialSign: "Иммунитет к мраку",
    axisRanges: {
      storyFocus: { min: 40, max: 60 },
      emotionalWeight: { min: 80, max: 100 },
      pace: { min: 40, max: 65 },
      darkness: { min: 80, max: 100 },
      scope: { min: 50, max: 70 },
      complexity: { min: 70, max: 90 },
    },
  },
];

describe("DnaIntroSection", () => {
  it("рендерит заголовок H1 и бейдж без запрещенных эмодзи", () => {
    renderWithClient(
      <DnaIntroSection
        archetypes={mockArchetypes}
        theme="dark"
        onStartTest={vi.fn()}
        onOpenDuel={vi.fn()}
      />
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Книжный ДНК: узнайте, какой вы читатель");

    // Проверяем наличие текста бейджа
    expect(screen.getByText(/Интерактивный спецпроект/i)).toBeInTheDocument();

    // Проверяем, что эмодзи блесток нет в документе
    expect(screen.queryByText(/✨/)).not.toBeInTheDocument();
  });

  it("вызывает onStartTest при клике на основную CTA-кнопку", () => {
    const onStartTest = vi.fn();
    renderWithClient(
      <DnaIntroSection
        archetypes={mockArchetypes}
        theme="dark"
        onStartTest={onStartTest}
        onOpenDuel={vi.fn()}
      />
    );

    const startButton = screen.getByRole("button", { name: /Начать тест \(3 минуты\)/i });
    fireEvent.click(startButton);
    expect(onStartTest).toHaveBeenCalledTimes(1);
  });

  it("вызывает onOpenDuel при клике на кнопку дуэли", () => {
    const onOpenDuel = vi.fn();
    renderWithClient(
      <DnaIntroSection
        archetypes={mockArchetypes}
        theme="dark"
        onStartTest={vi.fn()}
        onOpenDuel={onOpenDuel}
      />
    );

    const duelButton = screen.getByRole("button", { name: /Сравнить по номеру билета/i });
    fireEvent.click(duelButton);
    expect(onOpenDuel).toHaveBeenCalledTimes(1);
  });

  it("переключает вкладки орденов и фильтрует архетипы", () => {
    renderWithClient(
      <DnaIntroSection
        archetypes={mockArchetypes}
        theme="dark"
        onStartTest={vi.fn()}
        onOpenDuel={vi.fn()}
      />
    );

    const grid = screen.getByTestId("archetypes-grid");

    // По умолчанию выбран Орден Смыслов
    expect(grid).toHaveTextContent("Архитектор смыслов");
    expect(grid).not.toHaveTextContent("Хранитель запретных фолиантов");

    // Кликаем по Ордену Бездны
    const abyssButton = screen.getByRole("button", { name: /Орден Бездны/i });
    fireEvent.click(abyssButton);

    // Теперь виден Хранитель запретных фолиантов
    expect(grid).toHaveTextContent("Хранитель запретных фолиантов");
    expect(grid).not.toHaveTextContent("Архитектор смыслов");
  });

  it("рендерит печать «Запечатано» для карточек и вызывает onStartTest при клике на карточку архетипа", () => {
    const onStartTest = vi.fn();
    renderWithClient(
      <DnaIntroSection
        archetypes={mockArchetypes}
        theme="dark"
        onStartTest={onStartTest}
        onOpenDuel={vi.fn()}
      />
    );

    const seals = screen.getAllByText(/Запечатано/i);
    expect(seals.length).toBeGreaterThan(0);

    const card = screen.getByRole("button", { name: /Архитектор смыслов/i });
    fireEvent.click(card);
    expect(onStartTest).toHaveBeenCalledTimes(1);
  });

  it("снимает печать со всех карточек, если у пользователя есть билет, и подсвечивает его архетип", () => {
    const onGoToTicket = vi.fn();
    const mockTicket = {
      id: 1,
      ticketNumber: "BS-7777-7",
      archetype: "meaning-architect",
      archetypeName: "Архитектор смыслов",
      theme: "dark",
      axes: {
        storyFocus: 90,
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
      viewsCount: 1,
      shareCount: 0,
      duelsCount: 1,
      createdAt: new Date().toISOString(),
    };

    renderWithClient(
      <DnaIntroSection
        archetypes={mockArchetypes}
        theme="dark"
        userTicket={mockTicket}
        onStartTest={vi.fn()}
        onOpenDuel={vi.fn()}
        onGoToTicket={onGoToTicket}
      />
    );

    // Печать «Запечатано» должна отсутствовать
    expect(screen.queryByText(/Запечатано/i)).not.toBeInTheDocument();

    // Должен отображаться бейдж «Ваш архетип»
    expect(screen.getByText(/Ваш архетип/i)).toBeInTheDocument();

    // Должна быть кнопка перехода к своему билету
    const myTicketBtns = screen.getAllByRole("button", { name: /билет.*BS-7777-7/i });
    expect(myTicketBtns.length).toBeGreaterThan(0);
    fireEvent.click(myTicketBtns[0]);
    expect(onGoToTicket).toHaveBeenCalledTimes(1);
  });
});
