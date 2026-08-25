import { describe, it, expect } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CollectionCard } from "./CollectionCard";
import type { CollectionItem } from "@/types/collection";

function render(ui: Parameters<typeof rtlRender>[0]) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockCollection = {
  id: 1,
  slug: "horror-books",
  title: "Ужасы и мистика",
  type: "curated",
  isFeatured: false,
  coverImageUrl: "",
  tags: [],
  isPublished: true,
  order: 0,
  createdAt: "",
  updatedAt: "",
} as unknown as CollectionItem;

describe("CollectionCard", () => {
  it("карточка — настоящая ссылка на страницу коллекции (SEO: боты видят href)", () => {
    render(<CollectionCard collection={mockCollection} />);

    const card = screen.getByLabelText("Подборка: Ужасы и мистика");
    expect(card.tagName).toBe("A");
    expect(card).toHaveAttribute("href", "/collections/horror-books");
  });

  it("внутри ссылки нет вложенных интерактивных элементов", () => {
    render(<CollectionCard collection={mockCollection} />);

    const card = screen.getByLabelText("Подборка: Ужасы и мистика");
    expect(card.querySelectorAll("button, a")).toHaveLength(0);
  });

  it("CTA «Смотреть» остаётся видимым как часть ссылки", () => {
    render(<CollectionCard collection={mockCollection} />);

    const card = screen.getByLabelText("Подборка: Ужасы и мистика");
    expect(card.textContent).toContain("Смотреть");
  });
});
