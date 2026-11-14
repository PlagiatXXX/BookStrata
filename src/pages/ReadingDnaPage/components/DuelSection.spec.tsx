import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DuelSection } from "./DuelSection";

describe("DuelSection", () => {
  it("рендерит процент совместимости и совмещенный радар", () => {
    render(
      <DuelSection
        userAxes={{
          storyFocus: 65,
          emotionalWeight: 80,
          pace: 50,
          darkness: 70,
          scope: 60,
          complexity: 75,
        }}
        theme="light"
      />
    );

    expect(screen.getByText(/Совместимость/i)).toBeInTheDocument();
    expect(screen.getByText(/Сплошная линия — вы, пунктир — Алексей/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Скачать карточку дуэли/i })).toBeInTheDocument();
  });

  it("рендерит близнецов платформы и позволяет переключить пустое состояние", () => {
    render(
      <DuelSection
        userAxes={{
          storyFocus: 50,
          emotionalWeight: 50,
          pace: 50,
          darkness: 50,
          scope: 50,
          complexity: 50,
        }}
        theme="dark"
      />
    );

    expect(screen.getByText(/Книжные близнецы платформы/i)).toBeInTheDocument();
    expect(screen.getByText("Мира")).toBeInTheDocument();

    const emptyToggleBtn = screen.getByRole("button", { name: /Показать пустое состояние/i });
    fireEvent.click(emptyToggleBtn);

    expect(screen.getByText(/Близнецов пока нет/i)).toBeInTheDocument();
  });
});
