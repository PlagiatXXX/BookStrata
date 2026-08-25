import { describe, it, expect } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NeonFlipCollectionCard } from "./NeonFlipCollectionCard";
import type { CollectionItem } from "@/types/collection";

function render(ui: Parameters<typeof rtlRender>[0]) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockCollection = {
  id: 1,
  slug: "top-detective",
  title: "Топ детективов",
  type: "curated",
  isFeatured: false,
  coverImageUrl: "",
  tags: [],
  isPublished: true,
  order: 0,
  createdAt: "",
  updatedAt: "",
} as unknown as CollectionItem;

describe("NeonFlipCollectionCard", () => {
  it("карточка — настоящая ссылка на страницу коллекции (SEO: боты видят href)", () => {
    render(<NeonFlipCollectionCard collection={mockCollection} index={0} />);

    const card = screen.getByLabelText("Подборка: Топ детективов");
    expect(card.tagName).toBe("A");
    expect(card).toHaveAttribute("href", "/collections/top-detective");
  });

  it("внутри ссылки нет вложенных интерактивных элементов", () => {
    render(<NeonFlipCollectionCard collection={mockCollection} index={0} />);

    const card = screen.getByLabelText("Подборка: Топ детективов");
    expect(card.querySelectorAll("button, a")).toHaveLength(0);
  });

  it("CTA «Смотреть» остаётся видимым как часть ссылки", () => {
    render(<NeonFlipCollectionCard collection={mockCollection} index={0} />);

    const card = screen.getByLabelText("Подборка: Топ детективов");
    expect(card.textContent).toContain("Смотреть");
  });
});
