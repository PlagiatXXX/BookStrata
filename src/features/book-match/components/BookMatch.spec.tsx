import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: <T,>(value: T) => value,
}));
vi.mock("./BookRecommendations", () => ({
  BookRecommendations: ({ mood, excludeSlug }: { mood: Record<string, number | undefined>; excludeSlug?: string }) => (
    <div data-testid="recs" data-mood={JSON.stringify(mood)} data-exclude={excludeSlug} />
  ),
}));
// Слайдер — детально протестирован сам по себе (pointer capture не работает
// в happy-dom). Тут мокаем: в BookMatch-тестах важна persistance-логика.
vi.mock("./BookMatchSlider", () => ({
  BookMatchSlider: ({ axis, value, onChange }: {
    axis: string;
    value: number | undefined;
    onChange: (axis: string, value: number) => void;
  }) => (
    <button
      type="button"
      data-testid={`slider-${axis}`}
      data-active={value !== undefined}
      data-value={value}
      onClick={() => onChange(axis, 100)}
    >
      {axis}
    </button>
  ),
}));

import { BookMatch } from "./BookMatch";
import { readStoredMood } from "../hooks/useStoredMood";

const BOOK = {
  storyFocus: 20,
  emotionalWeight: 30,
  pace: 80,
  darkness: 90,
  scope: 50,
  complexity: 60,
  confidence: { storyFocus: 0.9, emotionalWeight: 0.9, pace: 0.9, darkness: 0.9, scope: 0.9, complexity: 0.9 },
  source: "ai" as const,
};

function renderUi(props: { bookSlug?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BookMatch book={BOOK} bookTitle="Тест" bookSlug={props.bookSlug} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BookMatch — persistance mood", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("слайдеры инициализируются из localStorage (score уже посчитан)", () => {
    localStorage.setItem("bookstrata:mood", JSON.stringify({ darkness: 70 }));
    renderUi();

    // Результат активен сразу (не заглушка «Настрой хотя бы одну шкалу»)
    expect(screen.queryByText(/настрой хотя бы одну шкалу/i)).toBeNull();
    // Слайдер darkness активен из storage
    expect(screen.getByTestId("slider-darkness").getAttribute("data-active")).toBe("true");
    expect(readStoredMood()).toEqual({ darkness: 70 });
  });

  it("сброс чистит сохранённый mood", () => {
    localStorage.setItem("bookstrata:mood", JSON.stringify({ darkness: 70 }));
    renderUi();

    // Кнопка сброса живёт в BookMatchResult (виден только при активном mood)
    fireEvent.click(screen.getByRole("button", { name: /сбросить настройки/i }));

    expect(readStoredMood()).toEqual({});
    // После сброса — снова заглушка
    expect(screen.getByText(/настрой хотя бы одну шкалу/i)).toBeDefined();
  });

  it("передаёт mood и excludeSlug в BookRecommendations", () => {
    localStorage.setItem("bookstrata:mood", JSON.stringify({ darkness: 70 }));
    renderUi({ bookSlug: "current-book" });

    const recs = screen.getByTestId("recs");
    expect(recs.getAttribute("data-mood")).toBe(JSON.stringify({ darkness: 70 }));
    expect(recs.getAttribute("data-exclude")).toBe("current-book");
  });

  it("смена слайдера обновляет ось и сохраняет прочие (перезапись значения)", () => {
    localStorage.setItem("bookstrata:mood", JSON.stringify({ darkness: 70, pace: 20 }));
    renderUi();

    // Мок-слайдер по клику вызывает onChange(axis, 100)
    fireEvent.click(screen.getByTestId("slider-storyFocus"));

    // storyFocus добавлен (100), существующие оси (darkness, pace) сохранены
    expect(readStoredMood()).toEqual({ storyFocus: 100, darkness: 70, pace: 20 });
  });
});
