// Тесты блока «AI-промпт для автора» в админке.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthorAiPrompt, AUTHOR_AI_PROMPT_TEST_ID } from "./AuthorAiPrompt";
import type { AuthorAiFill } from "./authorAi";

const clipboardMock = vi.fn();
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: clipboardMock },
  configurable: true,
  writable: true,
});

const PROMPT_BTN = /ai-промпт для автора/i;
const RESPONSE_LABEL = /ответ ии/i;
const FILL_BTN = /заполнить из ответа ии/i;

function renderUi(hasContent = false, onFill = vi.fn()) {
  render(
    <AuthorAiPrompt authorName="Лев Толстой" hasContent={hasContent} onFill={onFill} />,
  );
  return { onFill };
}

function pasteResponse(raw: string) {
  const textarea = screen.getByLabelText(RESPONSE_LABEL);
  fireEvent.change(textarea, { target: { value: raw } });
}

describe("AuthorAiPrompt", () => {
  beforeEach(() => vi.clearAllMocks());

  it("свёрнут по умолчанию, разворачивается по клику, промпт содержит имя автора", () => {
    renderUi();
    expect(screen.queryByText(/готовый промпт/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));
    expect(screen.getByText(/готовый промпт/i)).toBeDefined();
    expect(screen.getByText(/Лев Толстой/)).toBeDefined();
  });

  it("копирование пишет промпт в буфер", async () => {
    renderUi();
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));

    clipboardMock.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: /копировать/i }));

    expect(await screen.findByText(/скопировано/i)).toBeDefined();
    expect(clipboardMock).toHaveBeenCalledTimes(1);
    const copied = clipboardMock.mock.calls[0][0] as string;
    expect(copied).toContain("Лев Толстой");
    expect(copied).toContain("manifestoQuote");
  });

  it("невалидный JSON → ошибка, onFill не вызывается", () => {
    const { onFill } = renderUi();
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));

    pasteResponse("это не json");
    fireEvent.click(screen.getByRole("button", { name: FILL_BTN }));

    expect(screen.getByText(/не является валидным json/i)).toBeDefined();
    expect(onFill).not.toHaveBeenCalled();
  });

  it("валидный JSON → onFill с заполненными полями, ошибка исчезает", () => {
    const { onFill } = renderUi();
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));

    pasteResponse("невалидно");
    fireEvent.click(screen.getByRole("button", { name: FILL_BTN }));
    expect(screen.getByText(/не является валидным json/i)).toBeDefined();

    pasteResponse(
      JSON.stringify({
        badge: "Классик",
        motto: "Слоган",
        stats: [{ value: "14 млн", label: "тираж", source: "Википедия" }],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: FILL_BTN }));

    const fill = onFill.mock.calls[0][0] as AuthorAiFill;
    expect(fill.badge).toBe("Классик");
    expect(fill.motto).toBe("Слоган");
    expect(fill.statSources).toEqual(["Википедия"]);
    expect(screen.queryByText(/не является валидным json/i)).toBeNull();
  });

  it("при непустой форме — модалка подтверждения; «Отмена» не заливает", () => {
    const { onFill } = renderUi(true);
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));
    pasteResponse(JSON.stringify({ badge: "Классик" }));

    fireEvent.click(screen.getByRole("button", { name: FILL_BTN }));

    // Вместо нативного window.confirm — модалка админки
    expect(screen.getByText(/заменить текущие значения/i)).toBeInTheDocument();
    expect(onFill).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /отмена/i }));
    expect(screen.queryByText(/заменить текущие значения/i)).toBeNull();
    expect(onFill).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: FILL_BTN }));
    fireEvent.click(screen.getByRole("button", { name: /^заменить$/i }));
    expect(onFill).toHaveBeenCalledTimes(1);
  });

  it("форма пустая → модалка подтверждения не показывается", () => {
    const { onFill } = renderUi(false);
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));
    pasteResponse(JSON.stringify({ badge: "Классик" }));

    fireEvent.click(screen.getByRole("button", { name: FILL_BTN }));

    expect(screen.queryByText(/заменить текущие значения/i)).toBeNull();
    expect(onFill).toHaveBeenCalledTimes(1);
  });

  it("кнопка заливки отключена на пустом ответе", () => {
    renderUi();
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));

    const fillBtn = screen.getByRole("button", { name: FILL_BTN }) as HTMLButtonElement;
    expect(fillBtn.disabled).toBe(true);

    pasteResponse("{}");
    expect((screen.getByRole("button", { name: FILL_BTN }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("есть data-testid для интеграции", () => {
    renderUi();
    expect(screen.getByTestId(AUTHOR_AI_PROMPT_TEST_ID)).toBeDefined();
  });
});
