import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColorPickerPopover } from "./ColorPickerPopover";

describe("ColorPickerPopover", () => {
  let anchorEl: HTMLDivElement;

  beforeEach(() => {
    anchorEl = document.createElement("div");
    anchorEl.getBoundingClientRect = () => ({
      top: 100,
      bottom: 200,
      left: 50,
      right: 180,
      width: 130,
      height: 100,
      x: 50,
      y: 100,
      toJSON: () => {},
    });
    document.body.appendChild(anchorEl);
  });

  afterEach(() => {
    anchorEl.remove();
    vi.restoreAllMocks();
  });

  it("рендерится в document.body через портал и показывает текущий цвет", () => {
    const anchorRef = { current: anchorEl };
    render(
      <ColorPickerPopover
        currentColor="#FF0000"
        onChangeColor={vi.fn()}
        onClose={vi.fn()}
        anchorRef={anchorRef}
      />,
    );

    const input = screen.getByLabelText("HEX код цвета") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("FF0000");

    // Проверяем, что поповер находится прямо в document.body
    const popover = input.closest(".nb-heavy-border");
    expect(popover?.parentElement).toBe(document.body);
  });

  it("вызывает onChangeColor и onClose при клике на базовый цвет (swatch)", () => {
    const anchorRef = { current: anchorEl };
    const onChangeColor = vi.fn();
    const onClose = vi.fn();

    render(
      <ColorPickerPopover
        currentColor="#FF0000"
        onChangeColor={onChangeColor}
        onClose={onClose}
        anchorRef={anchorRef}
      />,
    );

    const blueButton = screen.getByLabelText("Выбрать цвет: #1E90FF");
    fireEvent.click(blueButton);

    expect(onChangeColor).toHaveBeenCalledWith("#1E90FF");
    expect(onClose).toHaveBeenCalled();
  });

  it("закрывается при нажатии Escape", () => {
    const anchorRef = { current: anchorEl };
    const onClose = vi.fn();

    render(
      <ColorPickerPopover
        currentColor="#FF0000"
        onChangeColor={vi.fn()}
        onClose={onClose}
        anchorRef={anchorRef}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("закрывается при клике вне поповера и anchor", () => {
    const anchorRef = { current: anchorEl };
    const onClose = vi.fn();

    render(
      <ColorPickerPopover
        currentColor="#FF0000"
        onChangeColor={vi.fn()}
        onClose={onClose}
        anchorRef={anchorRef}
      />,
    );

    const outsideEl = document.createElement("div");
    document.body.appendChild(outsideEl);

    fireEvent.mouseDown(outsideEl);
    expect(onClose).toHaveBeenCalled();

    outsideEl.remove();
  });

  it("не закрывается при клике внутри поповера", () => {
    const anchorRef = { current: anchorEl };
    const onClose = vi.fn();

    render(
      <ColorPickerPopover
        currentColor="#FF0000"
        onChangeColor={vi.fn()}
        onClose={onClose}
        anchorRef={anchorRef}
      />,
    );

    const input = screen.getByLabelText("HEX код цвета");
    fireEvent.mouseDown(input);
    expect(onClose).not.toHaveBeenCalled();
  });
});
