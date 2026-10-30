import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CollectionBooksGuide } from "./CollectionBooksGuide";
import type { Tier, Book } from "@/types";

const mockTiers: Record<string, Tier> = {
  tier_master: {
    id: "tier_master",
    title: "Шедевр",
    color: "#ef4444",
    bookIds: ["b1", "b2"],
  },
  tier_great: {
    id: "tier_great",
    title: "Отлично",
    color: "#f97316",
    bookIds: ["b3"],
  },
};

const mockBooks: Record<string, Book> = {
  b1: {
    id: "b1",
    title: "Властелин Колец",
    author: "Дж. Р. Р. Толкин",
    coverImageUrl: "/images/mistborn.jpeg",
    description: "Эпическое фэнтези о Кольце Всевластия.",
    slug: "vlastelin-kolec",
    authorSlug: "tolkien",
    genre: "Фэнтези",
  },
  b2: {
    id: "b2",
    title: "Имя ветра",
    author: "Патрик Ротфусс",
    coverImageUrl: "/images/wind.jpeg",
    description: "История Квоута — мага и музыканта.",
    slug: "imya-vetra",
    genre: "Героическое фэнтези",
  },
  b3: {
    id: "b3",
    title: "Ведьмак",
    author: "Анджей Сапковский",
    coverImageUrl: "/images/witcher.jpeg",
    description: "Приключения охотника на чудовищ.",
    slug: "vedmak",
    genre: "Темное фэнтези",
  },
};

describe("CollectionBooksGuide", () => {
  it("рендерит заголовок секции h2 и заголовки книг h3 с авторами и описанием", () => {
    render(
      <MemoryRouter>
        <CollectionBooksGuide
          tiers={mockTiers}
          tierOrder={["tier_master", "tier_great"]}
          books={mockBooks}
        />
      </MemoryRouter>,
    );

    // Секционный заголовок
    expect(
      screen.getByRole("heading", { level: 2, name: /Гид по книгам рейтинга/i }),
    ).toBeInTheDocument();

    // Уровни тиров
    expect(screen.getAllByText("Шедевр").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Отлично").length).toBeGreaterThan(0);

    // Заголовки книг h3
    expect(
      screen.getByRole("heading", { level: 3, name: /Властелин Колец/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Имя ветра/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Ведьмак/i }),
    ).toBeInTheDocument();

    // Авторы и описания
    const authorLink = screen.getByRole("link", { name: "Дж. Р. Р. Толкин" });
    expect(authorLink).toHaveAttribute("href", "/authors/tolkien");
    expect(
      screen.getByText("Эпическое фэнтези о Кольце Всевластия."),
    ).toBeInTheDocument();

    // Ссылки на книги
    const bookLinks = screen.getAllByRole("link", { name: /Властелин Колец/i });
    expect(bookLinks.length).toBeGreaterThan(0);
    expect(bookLinks[0]).toHaveAttribute("href", "/books/vlastelin-kolec");
  });

  it("вызывает onToggleShelf при клике по кнопке полки", () => {
    const handleToggle = vi.fn();

    render(
      <MemoryRouter>
        <CollectionBooksGuide
          tiers={mockTiers}
          tierOrder={["tier_master", "tier_great"]}
          books={mockBooks}
          shelfStatuses={{ b1: "want_to_read" }}
          onToggleShelf={handleToggle}
        />
      </MemoryRouter>,
    );

    // У книги b1 активен статус "В планах"
    const inPlanButtons = screen.getAllByRole("button", { name: /В планах/i });
    expect(inPlanButtons.length).toBeGreaterThan(0);

    // У книги b2 кнопка "Хочу прочитать"
    const wantButtons = screen.getAllByRole("button", { name: /Хочу прочитать/i });
    expect(wantButtons.length).toBeGreaterThan(0);

    fireEvent.click(wantButtons[0]);
    expect(handleToggle).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b2" }),
      "want_to_read",
    );
  });

  it("отображает кастомный критерий тира из данных tier.description", () => {
    const customTiers: Record<string, Tier> = {
      tier_custom: {
        id: "tier_custom",
        title: "Золотой фонд",
        color: "#f59e0b",
        description: "Книги с невероятной концовкой",
        bookIds: ["b1"],
      },
    };

    render(
      <MemoryRouter>
        <CollectionBooksGuide
          tiers={customTiers}
          tierOrder={["tier_custom"]}
          books={mockBooks}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("— Книги с невероятной концовкой")).toBeInTheDocument();
  });
});
