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
    expect(slider).toHaveAttribute("aria-valuenow", "30");

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(handleChange).toHaveBeenCalledWith(35);
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

  it("отображает пояснительную надпись рубрикатора при передаче rubricLabel", () => {
    render(
      <CreativeSlider
        label="Фокус повествования"
        leftLabel="Сюжет"
        rightLabel="Рефлексия"
        value={15}
        onChange={vi.fn()}
        theme="dark"
        rubricLabel="Чистый экшн. Погони, интриги, twist за twist."
      />
    );

    expect(
      screen.getByText("Чистый экшн. Погони, интриги, twist за twist.")
    ).toBeInTheDocument();
  });
});
