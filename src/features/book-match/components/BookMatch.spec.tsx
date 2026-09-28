import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: <T,>(value: T) => value,
}));

// Стейт моков жанров — управляем per-test через vi.hoisted
const genreState = vi.hoisted(() => ({
  authenticated: true,
  genres: [] as string[],
  mutate: vi.fn(),
}));

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => ({ isAuthenticated: genreState.authenticated }),
}));

vi.mock("@/hooks/useGenrePreferences", () => ({
  genrePreferencesKey: ["genre-preferences"],
  MAX_GENRE_PREFERENCES: 7,
  useGenrePreferences: () => ({ data: genreState.genres }),
  useSetGenrePreferences: () => ({ mutate: genreState.mutate }),
}));

vi.mock("./BookRecommendations", () => ({
  BookRecommendations: ({ mood, excludeSlug, genres }: {
    mood: Record<string, number | undefined>;
    excludeSlug?: string;
    genres?: string[];
  }) => (
    <div
      data-testid="recs"
      data-mood={JSON.stringify(mood)}
      data-exclude={excludeSlug}
      data-genres={genres ? JSON.stringify(genres) : null}
    />
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

function renderUi(props: { bookSlug?: string; bookGenre?: string | null; bookTags?: string[] } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BookMatch
          book={BOOK}
          bookTitle="Тест"
          bookSlug={props.bookSlug}
          bookGenre={props.bookGenre}
          bookTags={props.bookTags}
        />
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

describe("BookMatch — жанры профиля (7-я ось)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("bookstrata:mood", JSON.stringify({ darkness: 70 }));
    genreState.authenticated = true;
    genreState.genres = [];
    genreState.mutate.mockClear();
  });
  afterEach(() => localStorage.clear());

  it("гость не видит блок жанров и не передаёт genres в рекомендации", () => {
    genreState.authenticated = false;
    genreState.genres = ["fantasy"];
    renderUi();

    expect(screen.queryByText("Учитывать мои жанры")).toBeNull();
    expect(screen.getByTestId("recs").getAttribute("data-genres")).toBeNull();
  });

  it("по умолчанию тумблер снят — genres не передаются в рекомендации", () => {
    genreState.genres = ["fantasy", "horror"];
    renderUi();

    expect(screen.getByText("Учитывать мои жанры")).toBeDefined();
    expect(screen.getByRole("button", { name: "Фэнтези" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ужасы / Мистика" })).toBeDefined();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByTestId("recs").getAttribute("data-genres")).toBeNull();
  });

  it("клик по чипу снимает жанр (мутация с новым списком)", () => {
    genreState.genres = ["fantasy"];
    renderUi();

    fireEvent.click(screen.getByRole("button", { name: "Фэнтези" }));

    expect(genreState.mutate).toHaveBeenCalledWith([]);
  });

  it("включение тумблера передаёт genres в рекомендации", () => {
    genreState.genres = ["fantasy"];
    renderUi();

    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByTestId("recs").getAttribute("data-genres")).toBe(
      JSON.stringify(["fantasy"]),
    );
  });

  it("включённый флажок меняет процент совместимости (главная оценка учитывает жанры)", () => {
    genreState.genres = ["fantasy"];
    renderUi({ bookGenre: "Фэнтези", bookTags: [] });

    const readScore = () =>
      screen.getByText((_content, el) => /^\d+%$/.test(el?.textContent ?? ""))
        .textContent;
    const before = readScore();

    // Флажок выкл по умолчанию → включаем: genreSim попадает в matchScore
    fireEvent.click(screen.getByRole("checkbox"));
    expect(readScore()).not.toBe(before);

    // Выключаем — процент возвращается к исходному (ось деактивна)
    fireEvent.click(screen.getByRole("checkbox"));
    expect(readScore()).toBe(before);
  });

  it("без выбранных жанров блок не рендерится", () => {
    genreState.genres = [];
    renderUi();

    expect(screen.queryByText("Учитывать мои жанры")).toBeNull();
    expect(screen.getByTestId("recs").getAttribute("data-genres")).toBeNull();
  });
});
