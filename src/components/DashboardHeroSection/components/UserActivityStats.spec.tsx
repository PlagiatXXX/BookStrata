import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserActivityStats, formatTotalMinutes } from "./UserActivityStats";

const base = {
  tierListsCount: 4,
  publishedCount: 4,
  draftsCount: 0,
  totalBooks: 55,
  likesCount: 3,
  totalActiveMinutes: 332,
  onTierListsClick: vi.fn(),
  onPublishedClick: vi.fn(),
  onDraftsClick: vi.fn(),
  onBooksClick: vi.fn(),
  activeStat: null,
} satisfies React.ComponentProps<typeof UserActivityStats>;

describe("UserActivityStats", () => {
  it("рендерит 6 карточек, включая «Время на сайте»", () => {
    render(<UserActivityStats {...base} />);
    expect(screen.getByText("Создано тир-листов")).toBeInTheDocument();
    expect(screen.getByText("Получено лайков")).toBeInTheDocument();
    expect(screen.getByText("Время на сайте")).toBeInTheDocument();
    expect(screen.getByText("5 ч 32 мин")).toBeInTheDocument();
  });

  it("формат времени: часы, часы+минуты, минуты", () => {
    expect(formatTotalMinutes(120)).toBe("2 ч");
    expect(formatTotalMinutes(332)).toBe("5 ч 32 мин");
    expect(formatTotalMinutes(42)).toBe("42 мин");
  });

  it("клик по карточке вызывает обработчик и подсвечивает активную", () => {
    render(<UserActivityStats {...base} activeStat="tierlists" />);
    fireEvent.click(screen.getByText("Создано тир-листов"));
    expect(base.onTierListsClick).toHaveBeenCalledTimes(1);
    const card = screen.getByText("Создано тир-листов").closest("button");
    // Активная карточка подсвечена акцентным цветом (inline-стиль с glow)
    expect(card?.getAttribute("style")).toContain("box-shadow");
    expect(card?.getAttribute("style")).toContain("#38bdf899");
  });
});
