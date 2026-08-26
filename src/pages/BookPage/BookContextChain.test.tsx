// src/pages/BookPage/BookContextChain.test.tsx
// «Погружение в контекст»: hover на десктопе, на тач-устройствах тултип
// открывается тапом по иконке (toggle), клик вне — закрывает, невалидные
// элементы отфильтровываются.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookContextChain } from "./BookContextChain";

const items = [
  { icon: "history_edu", title: "Исторический контекст", text: "Эпоха Наполеоновских войн." },
  { icon: "menu_book", title: "Издание", text: "Первое полное издание 1869 года." },
];

// Классы видимости (opacity-*) лежат на контейнере тултипа, а не на тексте
function tooltipClasses(text: string): string {
  const el = screen.getByText(text);
  return el.parentElement?.className ?? "";
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left, top, right: left + width, bottom: top + height,
    width, height, x: left, y: top, toJSON: () => ({}),
  } as DOMRect;
}

// Мок геометрии: jsdom ничего не измеряет (все rect нулевые), а alignTooltip
// на нулевых размерах делает early-return. Подменяем rect кнопок и тултипов.
function mockGeometry(
  buttonRects: Array<{ left: number; width: number }>,
  tipWidth: number,
  viewportWidth: number,
) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(viewportWidth);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const cls = typeof this.className === "string" ? this.className : "";
    if (cls.includes("bp-btn-pulse")) {
      const idx = Array.from(document.querySelectorAll("button.bp-btn-pulse")).indexOf(this);
      const r = buttonRects[idx] ?? { left: 0, width: 48 };
      return rect(r.left, 0, r.width, 48);
    }
    if (cls.includes("bottom-full")) {
      return rect(0, 0, tipWidth, 200);
    }
    return original.call(this);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BookContextChain", () => {
  it("рендерит иконки и заголовок секции", () => {
    render(<BookContextChain items={items} />);

    expect(screen.getByText("Погружение в контекст")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Исторический контекст" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Издание" })).toBeTruthy();
  });

  it("тап по иконке открывает тултип (touch-режим), повторный тап закрывает", async () => {
    const user = userEvent.setup();
    render(<BookContextChain items={items} />);

    // Тултип скрыт (opacity-0, pointer-events-none)
    expect(tooltipClasses("Эпоха Наполеоновских войн.")).toContain("opacity-0");
    expect(screen.getByRole("button", { name: "Исторический контекст" }).getAttribute("aria-expanded")).toBe("false");

    await user.click(screen.getByRole("button", { name: "Исторический контекст" }));
    expect(tooltipClasses("Эпоха Наполеоновских войн.")).toContain("opacity-100");
    expect(screen.getByRole("button", { name: "Исторический контекст" }).getAttribute("aria-expanded")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Исторический контекст" }));
    expect(tooltipClasses("Эпоха Наполеоновских войн.")).toContain("opacity-0");
  });

  it("тап по второй иконке переключает тултип", async () => {
    const user = userEvent.setup();
    render(<BookContextChain items={items} />);

    await user.click(screen.getByRole("button", { name: "Исторический контекст" }));
    expect(tooltipClasses("Эпоха Наполеоновских войн.")).toContain("opacity-100");

    await user.click(screen.getByRole("button", { name: "Издание" }));
    expect(tooltipClasses("Эпоха Наполеоновских войн.")).toContain("opacity-0");
    expect(tooltipClasses("Первое полное издание 1869 года.")).toContain("opacity-100");
  });

  it("клик вне цепочки закрывает открытый тултип", async () => {
    const user = userEvent.setup();
    render(<BookContextChain items={items} />);

    await user.click(screen.getByRole("button", { name: "Издание" }));
    expect(tooltipClasses("Первое полное издание 1869 года.")).toContain("opacity-100");

    await user.click(document.body);
    expect(tooltipClasses("Первое полное издание 1869 года.")).toContain("opacity-0");
  });

  it("невалидные элементы (пустой icon/title/text) отфильтровываются", () => {
    const bad = [
      { icon: "", title: "Пустая иконка", text: "x" },
      { icon: "star", title: "", text: "x" },
      { icon: "star", title: "Без текста", text: "" },
      null as never,
    ];
    const { container } = render(<BookContextChain items={[...bad, items[0]]} />);
    expect(container.querySelectorAll("button").length).toBe(1);
  });

  it("текст тултипа переносит длинные слова по слогам (wrap-break-word + hyphens:auto), не вылезая за края", () => {
    const longText = "кккккlgglkrgvkkvgkvgkmmvkggvrkmgvkmvgmkvgmvmgkmvkmvkmkvmkvmkvmk";
    render(<BookContextChain items={[{ icon: "movie", title: "Кино", text: longText }]} />);

    const textEl = screen.getByText(longText);
    expect(textEl.className).toContain("wrap-break-word");
    expect(textEl.className).toContain("hyphens:auto");
    // Заголовок тултипа тоже защищён (в DOM — исходный регистр, uppercase делает CSS)
    const titleEl = screen.getByText("Кино");
    expect(titleEl.className).toContain("wrap-break-word");
    expect(titleEl.className).toContain("hyphens:auto");
  });

  // Регрессия: скрытые (opacity-0) тултипы рендерятся всегда и создают
  // scrollable overflow, если вылезают за viewport — до первого hover/тапа
  // сдвиг не применялся, и страница получала горизонтальный скролл на мобильных.
  it("выравнивает все тултипы сразу при маунте, не дожидаясь hover/тапа", () => {
    // Окно 390px. Вторая иконка у правого края: центрированный тултип
    // naturalLeft = 300 + 24 − 128 = 196, right = 196 + 256 = 452 → вылезает.
    mockGeometry([{ left: 40, width: 48 }, { left: 300, width: 48 }], 256, 390);

    render(<BookContextChain items={items} />);

    // Второй тултип прижат к правому краю с отступом 12px: dx = 122 − 196 = −74
    const tip2 = screen.getByText("Первое полное издание 1869 года.").parentElement as HTMLElement;
    expect(tip2.style.transform).toBe("translateX(-74px)");

    // Первый тултип вылезал слева (naturalLeft = 40 + 24 − 128 = −64): dx = 12 − (−64) = 76
    const tip1 = screen.getByText("Эпоха Наполеоновских войн.").parentElement as HTMLElement;
    expect(tip1.style.transform).toBe("translateX(76px)");
  });
});
