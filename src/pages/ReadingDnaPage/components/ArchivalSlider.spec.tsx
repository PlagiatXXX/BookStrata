import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArchivalSlider } from "./ArchivalSlider";

describe("ArchivalSlider", () => {
  it("рендерит шкалу со скрытым range input и подсечками меток", () => {
    render(
      <ArchivalSlider
        value={50}
        onChange={vi.fn()}
        marks={["Лёгкий бриз", "Баланс", "Глубоководное погружение"]}
        theme="light"
      />
    );

    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue("50");
    expect(screen.getByText(/20 — Лёгкий бриз/i)).toBeInTheDocument();
    expect(screen.getByText(/50 — Баланс/i)).toBeInTheDocument();
    expect(screen.getByText(/85 — Глубоководное погружение/i)).toBeInTheDocument();
  });

  it("вызывает onChange при сдвиге ползунка", () => {
    const handleChange = vi.fn();
    render(
      <ArchivalSlider
        value={50}
        onChange={handleChange}
        marks={["Лёгкий бриз", "Баланс", "Глубоководное погружение"]}
        theme="dark"
      />
    );

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "85" } });

    expect(handleChange).toHaveBeenCalledWith(85);
  });
});
