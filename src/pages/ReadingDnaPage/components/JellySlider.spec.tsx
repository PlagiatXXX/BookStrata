import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JellySlider } from "./JellySlider";

describe("JellySlider", () => {
  it("рендерит слайдер с корректными ARIA-атрибутами", () => {
    render(<JellySlider value={40} onChange={vi.fn()} ariaLabel="Тестовый слайдер" />);

    const slider = screen.getByRole("slider", { name: "Тестовый слайдер" });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "100");
    expect(slider).toHaveAttribute("aria-valuenow", "40");
  });

  it("содержит SVG goo-фильтр для жидкого слияния капли", () => {
    const { container } = render(<JellySlider value={50} onChange={vi.fn()} />);

    const filter = container.querySelector("filter");
    expect(filter).toBeInTheDocument();
    expect(filter?.querySelector("feGaussianBlur")).toBeInTheDocument();
    expect(filter?.querySelector("feColorMatrix")).toBeInTheDocument();
  });

  it("рендерит ключевые числовые отметки 0 и 100", () => {
    render(<JellySlider value={50} onChange={vi.fn()} />);

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("поддерживает управление с клавиатуры (стрелки, Home, End)", () => {
    const handleChange = vi.fn();
    render(<JellySlider value={40} onChange={handleChange} ariaLabel="Сюжет" />);

    const slider = screen.getByRole("slider", { name: "Сюжет" });

    // Стрелка вправо (+5): 40 -> 45
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(handleChange).toHaveBeenCalledWith(45);

    // Стрелка влево (-5): 45 -> 40
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(handleChange).toHaveBeenCalledWith(40);

    // Home (0)
    fireEvent.keyDown(slider, { key: "Home" });
    expect(handleChange).toHaveBeenCalledWith(0);

    // End (100)
    fireEvent.keyDown(slider, { key: "End" });
    expect(handleChange).toHaveBeenCalledWith(100);
  });

  it("поддерживает клик по числовым отметкам шкалы и запускает плавное движение", () => {
    const handleChange = vi.fn();
    render(<JellySlider value={20} onChange={handleChange} />);

    const mark100 = screen.getByRole("button", { name: "Отметка 100" });
    fireEvent.click(mark100);

    expect(handleChange).toHaveBeenCalledWith(100);
  });
});
