import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReadingGuidePrompt } from "./ReadingGuidePrompt";

const clipboardMock = vi.fn();
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: clipboardMock },
  configurable: true,
  writable: true,
});

const PROMPT_BTN = /ai-промпт для/i;

function renderUi() {
  return render(
    <ReadingGuidePrompt
      bookTitle="Баллада о падающих драконах"
      bookAuthor="Сара А. Паркер"
      genre="Романтическое фэнтези"
      tags={["драконы", "феи"]}
      description="Жажда мести в сердце Рэв не угасает."
    />,
  );
}

describe("ReadingGuidePrompt", () => {
  beforeEach(() => vi.clearAllMocks());

  it("свёрнут по умолчанию, разворачивается по клику", () => {
    renderUi();
    expect(screen.queryByText(/готовый промпт/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));
    expect(screen.getByText(/готовый промпт/i)).toBeDefined();
  });

  it("промпт содержит метаданные книги", () => {
    renderUi();
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));

    const promptEl = screen.getByText(/Баллада о падающих драконах/);
    expect(promptEl).toBeDefined();
    expect(screen.getByText(/Сара А\. Паркер/)).toBeDefined();
    expect(screen.getByText(/Романтическое фэнтези/)).toBeDefined();
  });

  it("промпт содержит правила и enum-значения бэка", () => {
    renderUi();
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));

    const pre = document.querySelector("pre");
    const text = pre?.textContent ?? "";
    expect(text).toContain("Галлюцинировать запрещено");
    expect(text).toContain("Динамичный");
    expect(text).toContain("Медитативный");
    expect(text).toContain("Легкое чтение");
    expect(text).toContain("Высокий порог входа");
    // Лимиты длины, формат, русский язык
    expect(text).toContain("150 символов");
    expect(text).toContain("markdown-обёрток");
    expect(text).toContain("на русском");
  });

  it("копирование пишет промпт в буфер", async () => {
    renderUi();
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));

    clipboardMock.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: /копировать/i }));

    expect(await screen.findByText(/скопировано/i)).toBeDefined();
    expect(clipboardMock).toHaveBeenCalledTimes(1);
    const copiedText = clipboardMock.mock.calls[0][0] as string;
    expect(copiedText).toContain("Баллада о падающих драконах");
    expect(copiedText).toContain("short_hook");
  });
});
