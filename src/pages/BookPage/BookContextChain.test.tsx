// src/pages/BookPage/BookContextChain.test.tsx
// «Погружение в контекст»: hover на десктопе, на тач-устройствах тултип
// открывается тапом по иконке (toggle), клик вне — закрывает, невалидные
// элементы отфильтровываются.
import { describe, it, expect } from "vitest";
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
});