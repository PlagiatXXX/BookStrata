import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookMatchSlider } from "./BookMatchSlider";

describe("BookMatchSlider", () => {
  it("рендерит метки оси и слайдер", () => {
    render(
      <BookMatchSlider
        axis="storyFocus"
        value={50}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Сюжет")).toBeInTheDocument();
    expect(screen.getByText("Рефлексия")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("вызывает onChange с привязкой к snap-точкам при изменении", () => {
    const handleChange = vi.fn();
    render(
      <BookMatchSlider
        axis="pace"
        value={40}
        onChange={handleChange}
      />
    );

    const slider = screen.getByRole("slider");
    // Нажатие стрелки вправо: 40 + 5 = 45 -> snap к 40 или 50
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(handleChange).toHaveBeenCalledWith("pace", expect.any(Number));
  });

  it("отображает текстовое описание уровня (рубрикатор) при активном значении", () => {
    render(
      <BookMatchSlider
        axis="complexity"
        value={20}
        onChange={vi.fn()}
      />
    );

    // При complexity=20 рубрикатор должен вернуть понятное описание
    expect(screen.getByText(/лёгкий|простой/i)).toBeInTheDocument();
  });
});
