// src/pages/BookPage/BookCharacters.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { BookCharacters } from "./BookCharacters";
import type { BookCharacterView } from "@/lib/bookApi";

function makeCharacter(overrides: Partial<BookCharacterView> & { id: number; characterId: number; name: string }): BookCharacterView {
  return {
    slug: `char-${overrides.characterId}`,
    aliases: [],
    universeSlug: null,
    role: "supporting",
    summary: `Описание персонажа ${overrides.name}.`,
    traits: [],
    relations: [],
    otherBooks: [],
    ...overrides,
  };
}

function renderCharacters(characters: BookCharacterView[]) {
  return render(
    <MemoryRouter>
      <BookCharacters characters={characters} />
    </MemoryRouter>,
  );
}

describe("BookCharacters", () => {
  let originalScrollIntoViewDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "scrollIntoView",
    );
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalScrollIntoViewDescriptor) {
      Object.defineProperty(
        Element.prototype,
        "scrollIntoView",
        originalScrollIntoViewDescriptor,
      );
    } else {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  });

  it("не рендерится при пустом массиве characters", () => {
    const { container } = renderCharacters([]);
    expect(container.firstChild).toBeNull();
  });

  it("отображает заголовок, имена, алиасы, бейдж роли, черты, описание и ссылки на другие книги", () => {
    const characters: BookCharacterView[] = [
      makeCharacter({
        id: 1,
        characterId: 10,
        name: "Данте Алигьери",
        aliases: ["Пилигрим"],
        role: "protagonist",
        traits: ["Созерцатель", "Искатель", "Поэт", "Странник", "Скрытая черта"],
        summary: "Проходит через три царства загробного мира.",
        otherBooks: [{ id: 2, slug: "novaya-zhizn", title: "Новая жизнь" }],
      }),
      makeCharacter({
        id: 2,
        characterId: 20,
        name: "Вергилий",
        role: "supporting",
        summary: "Римский поэт и проводник.",
      }),
    ];

    renderCharacters(characters);

    expect(screen.getByRole("heading", { name: "Ключевые герои" })).toBeInTheDocument();
    expect(screen.getByText("Данте Алигьери")).toBeInTheDocument();
    expect(screen.getByText(/Пилигрим/)).toBeInTheDocument();
    expect(screen.getByText("Главный герой")).toBeInTheDocument();
    expect(screen.getByText("Ключевой")).toBeInTheDocument();
    expect(screen.getByText("Проходит через три царства загробного мира.")).toBeInTheDocument();

    // До 4 тегов traits
    expect(screen.getByText("Созерцатель")).toBeInTheDocument();
    expect(screen.getByText("Искатель")).toBeInTheDocument();
    expect(screen.getByText("Поэт")).toBeInTheDocument();
    expect(screen.getByText("Странник")).toBeInTheDocument();
    expect(screen.queryByText("Скрытая черта")).not.toBeInTheDocument();

    // Ссылка otherBooks
    const bookLink = screen.getByRole("link", { name: "Новая жизнь" });
    expect(bookLink).toHaveAttribute("href", "/books/novaya-zhizn");

    // Меньше 6 персонажей — нет пилюль фильтрации и кнопки раскрытия
    expect(screen.queryByRole("button", { name: /Показать всех героев/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Все/ })).not.toBeInTheDocument();
  });

  it("при >= 6 персонажах показывает фильтр по ролям и кнопку «Показать всех героев (N)»", async () => {
    const user = userEvent.setup();
    const characters: BookCharacterView[] = [
      makeCharacter({ id: 1, characterId: 101, name: "Герой 1", role: "protagonist" }),
      makeCharacter({ id: 2, characterId: 102, name: "Антагонист 1", role: "antagonist" }),
      makeCharacter({ id: 3, characterId: 103, name: "Ключевой 1", role: "supporting" }),
      makeCharacter({ id: 4, characterId: 104, name: "Ключевой 2", role: "supporting" }),
      makeCharacter({ id: 5, characterId: 105, name: "Второстепенный 1", role: "minor" }),
      makeCharacter({ id: 6, characterId: 106, name: "Второстепенный 2", role: "minor" }),
      makeCharacter({ id: 7, characterId: 107, name: "Скрытый 7", role: "minor" }),
    ];

    renderCharacters(characters);

    // 7-я карточка есть в DOM (для пререндера), но скрыта
    const seventhCard = document.getElementById("character-107");
    expect(seventhCard).not.toBeNull();
    expect(seventhCard).not.toBeVisible();

    // Пилюли фильтрации по ролям с aria-pressed
    const allBtn = screen.getByRole("button", { name: /^Все(\s|$)/i });
    expect(allBtn).toHaveAttribute("aria-pressed", "true");

    const antagonistBtn = screen.getByRole("button", { name: /Антагонист/i });
    expect(antagonistBtn).toHaveAttribute("aria-pressed", "false");

    // Фильтрация по роли
    await user.click(antagonistBtn);
    expect(antagonistBtn).toHaveAttribute("aria-pressed", "true");
    expect(allBtn).toHaveAttribute("aria-pressed", "false");
    expect(document.getElementById("character-102")).toBeVisible();
    expect(document.getElementById("character-101")).not.toBeVisible();

    // Возврат к «Все» и раскрытие скрытых > 6 карточек
    await user.click(allBtn);
    const showAllBtn = screen.getByRole("button", { name: /Показать всех героев \(7\)/i });
    await user.click(showAllBtn);
    expect(document.getElementById("character-107")).toBeVisible();
  });

  it("клик по чипу связи сбрасывает фильтр, раскрывает список, вызывает scrollIntoView и подсвечивает карточку", async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    const characters: BookCharacterView[] = [
      makeCharacter({
        id: 1,
        characterId: 101,
        name: "Данте",
        role: "protagonist",
        relations: [{ targetCharacterId: 107, targetName: "Вергилий", label: "проводник" }],
      }),
      makeCharacter({ id: 2, characterId: 102, name: "Беатриче", role: "supporting" }),
      makeCharacter({ id: 3, characterId: 103, name: "Минос", role: "minor" }),
      makeCharacter({ id: 4, characterId: 104, name: "Харон", role: "minor" }),
      makeCharacter({ id: 5, characterId: 105, name: "Цербер", role: "minor" }),
      makeCharacter({ id: 6, characterId: 106, name: "Люцифер", role: "antagonist" }),
      makeCharacter({ id: 7, characterId: 107, name: "Вергилий", role: "supporting" }),
    ];

    renderCharacters(characters);

    // Активируем фильтр только по protagonist, чтобы Вергилий (supporting, 7-й) был скрыт и отфильтрован
    const protagonistBtn = screen.getByRole("button", { name: /Главный герой/i });
    await user.click(protagonistBtn);
    expect(document.getElementById("character-107")).not.toBeVisible();

    // Кликаем по чипу связи «проводник: Вергилий»
    const relBtn = screen.getByRole("button", { name: /проводник:\s*Вергилий/i });
    await user.click(relBtn);

    // Фильтр сбросился на «Все», список раскрылся, целевая карточка видна и подсвечена
    const allBtn = screen.getByRole("button", { name: /^Все(\s|$)/i });
    expect(allBtn).toHaveAttribute("aria-pressed", "true");

    const targetCard = document.getElementById("character-107");
    expect(targetCard).toBeVisible();
    expect(scrollSpy).toHaveBeenCalled();
    expect(targetCard?.getAttribute("data-highlighted")).toBe("true");
  });

  it("граничный случай characters.length === 6: фильтры ролей есть, кнопки «Показать всех героев» нет", () => {
    const characters: BookCharacterView[] = [
      makeCharacter({ id: 1, characterId: 201, name: "Герой 1", role: "protagonist" }),
      makeCharacter({ id: 2, characterId: 202, name: "Антагонист 1", role: "antagonist" }),
      makeCharacter({ id: 3, characterId: 203, name: "Ключевой 1", role: "supporting" }),
      makeCharacter({ id: 4, characterId: 204, name: "Ключевой 2", role: "supporting" }),
      makeCharacter({ id: 5, characterId: 205, name: "Второстепенный 1", role: "minor" }),
      makeCharacter({ id: 6, characterId: 206, name: "Второстепенный 2", role: "minor" }),
    ];

    renderCharacters(characters);

    expect(screen.getByRole("button", { name: /^Все(\s|$)/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Показать всех героев/i })).not.toBeInTheDocument();
    expect(document.getElementById("character-206")).toBeVisible();
  });

  it("при активном фильтре роли карточка с индексом >= 6 становится видимой без нажатия «Показать всех героев»", async () => {
    const user = userEvent.setup();
    const characters: BookCharacterView[] = [
      makeCharacter({ id: 1, characterId: 301, name: "Герой 1", role: "protagonist" }),
      makeCharacter({ id: 2, characterId: 302, name: "Ключевой 1", role: "supporting" }),
      makeCharacter({ id: 3, characterId: 303, name: "Ключевой 2", role: "supporting" }),
      makeCharacter({ id: 4, characterId: 304, name: "Ключевой 3", role: "supporting" }),
      makeCharacter({ id: 5, characterId: 305, name: "Второстепенный 1", role: "minor" }),
      makeCharacter({ id: 6, characterId: 306, name: "Второстепенный 2", role: "minor" }),
      makeCharacter({ id: 7, characterId: 307, name: "Поздний Антагонист", role: "antagonist" }),
    ];

    renderCharacters(characters);

    expect(document.getElementById("character-307")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: /Антагонист/i }));

    expect(document.getElementById("character-307")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Показать всех героев/i })).not.toBeInTheDocument();
  });

  it("автоматически сбрасывает data-highlighted через 2200ms и защищает seq при быстром повторном клике", () => {
    vi.useFakeTimers();

    const characters: BookCharacterView[] = [
      makeCharacter({
        id: 1,
        characterId: 401,
        name: "Данте",
        role: "protagonist",
        relations: [{ targetCharacterId: 402, targetName: "Вергилий", label: "проводник" }],
      }),
      makeCharacter({ id: 2, characterId: 402, name: "Вергилий", role: "supporting" }),
    ];

    renderCharacters(characters);

    const relBtn = screen.getByRole("button", { name: /проводник:\s*Вергилий/i });
    const targetCard = document.getElementById("character-402");

    // Первый клик
    fireEvent.click(relBtn);
    expect(targetCard).toHaveAttribute("data-highlighted", "true");

    // Прошло 1000ms — подсветка активна; делаем повторный клик (новый seq)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(targetCard).toHaveAttribute("data-highlighted", "true");

    fireEvent.click(relBtn);
    expect(targetCard).toHaveAttribute("data-highlighted", "true");

    // Через ещё 1200ms (2200ms от 1-го клика, но лишь 1200ms от 2-го) старый таймер не должен сбросить подсветку
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(targetCard).toHaveAttribute("data-highlighted", "true");

    // Ещё через 1000ms (итого 2200ms от 2-го клика) подсветка сбрасывается
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(targetCard).not.toHaveAttribute("data-highlighted");
  });
});
