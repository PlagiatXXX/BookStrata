import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LiveTicketPreview } from "./LiveTicketPreview";
import type { DnaAxesData } from "@/lib/readingDnaApi";

const defaultAxes: DnaAxesData = {
  storyFocus: 0,
  emotionalWeight: 0,
  pace: 0,
  darkness: 0,
  scope: 0,
  complexity: 0,
};

describe("LiveTicketPreview", () => {
  it("рендерит заголовок читательского формуляра и архивный шифр", () => {
    render(
      <LiveTicketPreview
        axes={defaultAxes}
        currentStep={1}
        theme="dark"
      />
    );

    expect(screen.getByText(/архивный формуляр читателя/i)).toBeInTheDocument();
    expect(screen.getByText(/билет тайного общества/i)).toBeInTheDocument();
  });

  it("рендерит SVG-радар с 6 лучами и полигоном ДНК", () => {
    const { container } = render(
      <LiveTicketPreview
        axes={{
          ...defaultAxes,
          storyFocus: 75,
          darkness: 60,
        }}
        currentStep={2}
        theme="dark"
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    const polygon = container.querySelector("polygon[data-testid='dna-radar-polygon']");
    expect(polygon).toBeInTheDocument();
    expect(polygon?.getAttribute("points")).toBeTruthy();
  });

  it("отображает статус калибровки в зависимости от currentStep", () => {
    const { rerender } = render(
      <LiveTicketPreview
        axes={defaultAxes}
        currentStep={1}
        theme="dark"
      />
    );
    expect(screen.getByText(/калибровка: 1 \/ 6/i)).toBeInTheDocument();

    rerender(
      <LiveTicketPreview
        axes={defaultAxes}
        currentStep={5}
        theme="dark"
      />
    );
    expect(screen.getByText(/калибровка: 5 \/ 6/i)).toBeInTheDocument();
  });

  it("проявляет слоты артефакта на поздних шагах", () => {
    const { rerender } = render(
      <LiveTicketPreview
        axes={defaultAxes}
        currentStep={2}
        theme="dark"
      />
    );
    // На шаге 2 слоты книг еще скрыты/заблокированы
    expect(screen.getByTestId("books-placeholder")).toBeInTheDocument();

    rerender(
      <LiveTicketPreview
        axes={defaultAxes}
        currentStep={6}
        theme="dark"
      />
    );
    // На шаге 6 слоты книг активированы
    expect(screen.getByTestId("books-unmasked")).toBeInTheDocument();
  });

  it("поддерживает крафтовую тему", () => {
    const { container } = render(
      <LiveTicketPreview
        axes={defaultAxes}
        currentStep={1}
        theme="craft"
      />
    );
    expect(container.firstChild).toHaveClass("theme-craft");
  });
});
