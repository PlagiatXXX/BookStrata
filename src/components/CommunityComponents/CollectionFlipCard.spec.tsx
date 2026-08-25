import { describe, it, expect } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CollectionFlipCard } from "./CollectionFlipCard";
import type { CollectionItem } from "@/types/collection";

// Карточка содержит <Link> (react-router) — тесты оборачиваем в MemoryRouter
function render(ui: Parameters<typeof rtlRender>[0]) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockCollection = {
  id: 1,
  slug: "top-fantasy",
  title: "Топ фэнтези",
  type: "curated",
  isFeatured: false,
  coverImageUrl: "",
  tags: [],
  isPublished: true,
  order: 0,
  createdAt: "",
  updatedAt: "",
} as unknown as CollectionItem;

describe("CollectionFlipCard", () => {
  it("карточка — настоящая ссылка на страницу коллекции (SEO: боты видят href)", () => {
    render(<CollectionFlipCard collection={mockCollection} />);

    const card = screen.getByLabelText("Подборка: Топ фэнтези");
    expect(card.tagName).toBe("A");
    expect(card).toHaveAttribute("href", "/collections/top-fantasy");
  });

  it("внутри ссылки нет вложенных интерактивных элементов (валидный HTML: button в a запрещён)", () => {
    render(<CollectionFlipCard collection={mockCollection} />);

    const card = screen.getByLabelText("Подборка: Топ фэнтези");
    expect(card.querySelectorAll("button, a")).toHaveLength(0);
  });

  it("CTA «Смотреть» остаётся видимым (теперь как часть ссылки)", () => {
    render(<CollectionFlipCard collection={mockCollection} />);

    const card = screen.getByLabelText("Подборка: Топ фэнтези");
    expect(card.textContent).toContain("Смотреть");
  });

  it("ссылка отправляет аналитику через data-analytics", () => {
    render(<CollectionFlipCard collection={mockCollection} />);

    const card = screen.getByLabelText("Подборка: Топ фэнтези");
    expect(card).toHaveAttribute("data-analytics", "cta.landing.open_collection");
  });
});
