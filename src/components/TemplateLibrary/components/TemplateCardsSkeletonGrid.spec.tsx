import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TemplateCardsSkeletonGrid } from "./TemplateCardsSkeletonGrid";

describe("TemplateCardsSkeletonGrid", () => {
  it("рендерит заданное количество карточек скелетона с анимацией", () => {
    const { container } = render(<TemplateCardsSkeletonGrid count={8} />);
    const grid = container.querySelector(".tpl-card-grid");
    expect(grid).not.toBeNull();
    expect(grid?.getAttribute("aria-busy")).toBe("true");

    const cards = container.querySelectorAll(".tpl-card");
    expect(cards).toHaveLength(8);

    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });
});
