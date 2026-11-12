import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InteractiveTicket } from "./InteractiveTicket";
import type { ReadingDnaResponseData } from "@/lib/readingDnaApi";

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
    render(<InteractiveTicket ticket={sampleTicket} onRetake={vi.fn()} />);

    expect(screen.getByText(/BS-7492-X/i)).toBeInTheDocument();
    expect(screen.getByText("Алиса")).toBeInTheDocument();
    expect(screen.getByText("Хранитель запретных фолиантов")).toBeInTheDocument();
    expect(screen.getByText(/В тенях всегда скрыто больше правды/i)).toBeInTheDocument();
  });

  it("отображает 3 святыни и криптонит", () => {
    render(<InteractiveTicket ticket={sampleTicket} onRetake={vi.fn()} />);

    expect(screen.getByText("1984")).toBeInTheDocument();
    expect(screen.getByText("Франкенштейн")).toBeInTheDocument();
    expect(screen.getByText("Дракула")).toBeInTheDocument();
    expect(screen.getByText("Сумерки")).toBeInTheDocument();
  });

  it("предоставляет кнопки шеринга и вызова на дуэль", () => {
    render(<InteractiveTicket ticket={sampleTicket} onRetake={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Поделиться/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Бросить вызов/i })).toBeInTheDocument();
  });
});
