// Тесты встройки AI-промпта в редактор контента автора.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AuthorContentEditor } from "./AuthorContentEditor";
import type { AdminAuthorContent } from "@/lib/adminAuthorsApi";

const emptyContent: AdminAuthorContent = {
  heroImageUrl: null,
  badge: null,
  motto: null,
  manifestoQuote: null,
  manifestoAuthor: null,
  manifestoRole: null,
  aboutText: null,
  stats: [],
  showcase: [],
  adaptations: [],
  pressQuotes: [],
};

function renderEditor(content: AdminAuthorContent = emptyContent) {
  return render(
    <AuthorContentEditor
      authorName="Лев Толстой"
      content={content}
      books={[]}
      booksLoading={false}
      savePending={false}
      onSave={vi.fn()}
    />,
  );
}

const PROMPT_BTN = /ai-промпт для автора/i;

describe("AuthorContentEditor — подсказки секций", () => {
  it("в секции «Статистика» есть подсказка с примерами цифр", () => {
    renderEditor();

    const hint = screen.getByText(/кол-во написанных книг/i);
    expect(hint).toBeInTheDocument();
    expect(hint.textContent).toMatch(/экранизац/i);
    expect(hint.textContent).toMatch(/достоверн/i);
  });
});

describe("AuthorContentEditor — AI-промпт", () => {
  beforeEach(() => vi.clearAllMocks());

  it("блок «AI-промпт для автора» есть в шапке редактора", () => {
    renderEditor();
    expect(screen.getByTestId("author-ai-prompt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: PROMPT_BTN })).toBeInTheDocument();
  });

  it("ответ ИИ заливает поля формы и источники статистики", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));

    fireEvent.change(screen.getByLabelText(/ответ ии/i), {
      target: {
        value: JSON.stringify({
          badge: "Классик",
          motto: "Слоган о памяти",
          manifestoQuote: "Цитата манифеста.",
          aboutText: "О траектории.",
          stats: [{ value: "14 млн", label: "тираж", source: "Википедия" }],
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /заполнить из ответа ии/i }));

    expect(screen.getByLabelText("Бейдж")).toHaveValue("Классик");
    expect(screen.getByLabelText("Девиз")).toHaveValue("Слоган о памяти");
    expect(screen.getByLabelText("Цитата манифеста")).toHaveValue("Цитата манифеста.");
    expect(screen.getByLabelText("Описание автора")).toHaveValue("О траектории.");

    // Источники статистики видны под секцией для сверки
    const srcBlock = screen.getByText(/источники из ответа ии/i).closest("div");
    expect(srcBlock).not.toBeNull();
    expect(within(srcBlock as HTMLElement).getByText(/википедия/i)).toBeInTheDocument();
    // В самой строке статистики source не попал
    expect(screen.getByLabelText("Значение")).toHaveValue("14 млн");
    expect(screen.getByLabelText("Подпись")).toHaveValue("тираж");
  });

  it("кнопка «Сохранить» уходит в onSave с payload без source", () => {
    const onSave = vi.fn();
    render(
      <AuthorContentEditor
        authorName="X"
        content={emptyContent}
        books={[]}
        booksLoading={false}
        savePending={false}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: PROMPT_BTN }));
    fireEvent.change(screen.getByLabelText(/ответ ии/i), {
      target: { value: JSON.stringify({ badge: "Классик", stats: [{ value: "10", label: "штук", source: "Сайт" }] }) },
    });
    fireEvent.click(screen.getByRole("button", { name: /заполнить из ответа ии/i }));

    fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.badge).toBe("Классик");
    expect(payload.stats).toEqual([{ value: "10", label: "штук" }]);
    expect(JSON.stringify(payload)).not.toContain("Сайт");
  });
});
