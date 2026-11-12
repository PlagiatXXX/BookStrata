import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreativeSlider } from "./CreativeSlider";

describe("CreativeSlider", () => {
  it("отображает название шкалы, левый и правый полюса", () => {
    render(
      <CreativeSlider
        label="Фокус повествования"
        leftLabel="Сюжет и действие"
        rightLabel="Смыслы и рефлексия"
        value={50}
        onChange={vi.fn()}
        theme="dark"
      />
    );

    expect(screen.getByText("Фокус повествования")).toBeInTheDocument();
    expect(screen.getByText("Сюжет и действие")).toBeInTheDocument();
    expect(screen.getByText("Смыслы и рефлексия")).toBeInTheDocument();
  });

  it("вызывает onChange при перемещении ползунка", () => {
    const handleChange = vi.fn();
    render(
      <CreativeSlider
        label="Темп чтения"
        leftLabel="Стремительный"
        rightLabel="Медитативный"
        value={30}
        onChange={handleChange}
        theme="dark"
      />
    );

    const slider = screen.getByRole("slider");
    expect(slider).toHaveValue("30");

    fireEvent.change(slider, { target: { value: "75" } });
    expect(handleChange).toHaveBeenCalledWith(75);
  });

  it("корректно отображает бейдж текущего процента", () => {
    render(
      <CreativeSlider
        label="Градус мрачности"
        leftLabel="Уютный свет"
        rightLabel="Экзистенциальная бездна"
        value={85}
        onChange={vi.fn()}
        theme="craft"
      />
    );

    expect(screen.getByText("85%")).toBeInTheDocument();
  });
});
