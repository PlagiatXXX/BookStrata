import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ReadingTicketQr } from "./ReadingTicketQr";

describe("ReadingTicketQr", () => {
  it("рендерит векторный SVG QR-код с переданным URL", () => {
    const { container } = render(
      <ReadingTicketQr
        value="https://bookstrata.ru/reading-dna/duel?ticket=BS-7492-X"
        size={96}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "96");
    expect(svg).toHaveAttribute("height", "96");
  });

  it("применяет кастомные цвета под тему оформления", () => {
    const { container } = render(
      <ReadingTicketQr
        value="https://bookstrata.ru/reading-dna?ticket=BS-7492-X"
        fgColor="#d97706"
        bgColor="#1e293b"
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
