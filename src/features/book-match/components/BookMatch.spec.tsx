import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: <T,>(value: T) => value,
}));

import type { ReadingDnaResponseData } from "@/lib/readingDnaApi";

// Стейт моков ДНК
const dnaMock = vi.hoisted(() => ({
  dna: null as ReadingDnaResponseData | null,
}));

vi.mock("@/hooks/useMyReadingDna", () => ({
  useMyReadingDna: () => ({ dna: dnaMock.dna }),
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
  MAX_GENRE_PREFERENCES: 9,
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

const SAMPLE_DNA = {
  id: 1,
  ticketNumber: "BS-1234-A",
  archetype: "abyss_archivist",
  archetypeName: "Архивариус Бездны",
  theme: "dark",
  axes: {
    storyFocus: 20,
    emotionalWeight: 30,
    pace: 80,
    darkness: 90,
    scope: 50,
    complexity: 60,
  },
  favoriteBooks: [{ title: "Имя розы", author: "Умберто Эко", bookId: 10 }],
  kryptoniteBook: null,
  likedGenres: ["Детектив"],
  dislikedGenres: ["Любовный роман"],
  favoriteAuthors: ["Умберто Эко"],
  viewsCount: 0,
  shareCount: 0,
  duelsCount: 0,
  createdAt: "2026-01-01",
};

function renderUi(props: {
  bookTitle?: string;
  bookAuthor?: string | null;
  bookId?: number;
  bookSlug?: string;
  bookGenre?: string | null;
  bookTags?: string[];
} = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BookMatch
          book={BOOK}
          bookTitle={props.bookTitle ?? "Тест"}
          bookAuthor={props.bookAuthor}
          bookId={props.bookId}
          bookSlug={props.bookSlug}
          bookGenre={props.bookGenre}
          bookTags={props.bookTags}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BookMatch — persistance mood", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    dnaMock.dna = null;
  });
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
    mockNavigate.mockReset();
    dnaMock.dna = null;
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

describe("BookMatch — Режим Книжного ДНК и Guest Sandbox", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    dnaMock.dna = null;
  });
  afterEach(() => localStorage.clear());

  it("если dna есть в профиле: score рассчитывается от dna.axes, виден архетип и сигналы, слайдеры свернуты", () => {
    dnaMock.dna = SAMPLE_DNA;
    renderUi({
      bookTitle: "Имя розы",
      bookAuthor: "Умберто Эко",
      bookId: 10,
    });

    // Score рассчитан от dna.axes (100%), заглушки нет
    expect(screen.queryByText(/настрой хотя бы одну шкалу/i)).toBeNull();
    expect(screen.getByText("100")).toBeDefined();
    expect(screen.getByText(/ПОПАЛО В ТОЧКУ/i)).toBeDefined();

    // Отображается имя архетипа
    expect(screen.getByText("Архивариус Бездны")).toBeDefined();

    // Отображаются сигналы ДНК (автор и книга-святыня)
    expect(screen.getByText(/Любимый автор из твоего билета/i)).toBeDefined();
    expect(screen.getByText(/Входит в золотую тройку твоего ДНК/i)).toBeDefined();

    // Слайдеры свернуты, видна кнопка настройки под настроение сейчас
    expect(screen.queryByTestId("slider-darkness")).toBeNull();
    expect(
      screen.getByRole("button", { name: /настроить под настроение сейчас/i }),
    ).toBeDefined();
  });

  it("клик по «Настроить под настроение сейчас» раскрывает слайдеры и показывает плашку оверрайда", () => {
    dnaMock.dna = SAMPLE_DNA;
    renderUi();

    // Кликаем по кнопке настройки под настроение
    fireEvent.click(
      screen.getByRole("button", { name: /настроить под настроение сейчас/i }),
    );

    // Слайдеры раскрыты
    expect(screen.getByTestId("slider-darkness")).toBeDefined();
    expect(screen.getByTestId("slider-darkness").getAttribute("data-value")).toBe("90");

    // Плашка оверрайда и кнопка возврата ДНК
    expect(
      screen.getByText(/Режим текущего настроения \(отклонение от твоего ДНК\)/i),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /вернуть мой днк/i })).toBeDefined();
  });

  it("клик по «Вернуть мой ДНК» возвращает слайдеры в свернутое состояние", () => {
    dnaMock.dna = SAMPLE_DNA;
    renderUi();

    // Раскрываем оверрайд
    fireEvent.click(
      screen.getByRole("button", { name: /настроить под настроение сейчас/i }),
    );
    expect(screen.getByTestId("slider-darkness")).toBeDefined();

    // Возвращаем ДНК
    fireEvent.click(screen.getByRole("button", { name: /вернуть мой днк/i }));

    // Слайдеры снова скрыты, кнопка настройки снова на месте
    expect(screen.queryByTestId("slider-darkness")).toBeNull();
    expect(
      screen.getByRole("button", { name: /настроить под настроение сейчас/i }),
    ).toBeDefined();
    expect(
      screen.queryByText(/Режим текущего настроения \(отклонение от твоего ДНК\)/i),
    ).toBeNull();
  });

  it("смена слайдера в режиме оверрайда обновляет оценку и не затрагивает localStorage", () => {
    dnaMock.dna = {
      archetypeName: "Архивариус Бездны",
      axes: {
        storyFocus: 20,
        emotionalWeight: 30,
        pace: 80,
        darkness: 90,
        scope: 50,
        complexity: 60,
      },
    } as any;
    renderUi();

    // Открываем оверрайд
    fireEvent.click(
      screen.getByRole("button", { name: /настроить под настроение сейчас/i }),
    );

    // Двигаем слайдер storyFocus
    fireEvent.click(screen.getByTestId("slider-storyFocus"));

    // localStorage гостя не должен быть затронут
    expect(localStorage.getItem("bookstrata:mood")).toBeNull();
  });

  it("для гостя при настроенном настроении отображается CTA-карточка «Создать Книжный ДНК», клик сохраняет черновик и редиректит", () => {
    dnaMock.dna = null;
    localStorage.setItem("bookstrata:mood", JSON.stringify({ darkness: 70 }));
    renderUi();

    // Отображается CTA
    expect(
      screen.getByText(/Хочешь узнавать совместимость со всеми книгами автоматически\?/i),
    ).toBeDefined();
    expect(screen.getByText(/Создай свой Книжный ДНК за 2 минуты/i)).toBeDefined();

    const ctaButton = screen.getByRole("button", { name: /Создать Книжный ДНК/i });
    fireEvent.click(ctaButton);

    // Проверяем редирект и драфт в localStorage
    expect(mockNavigate).toHaveBeenCalledWith("/dna");
    const rawDraft = localStorage.getItem("bs_reading_dna_draft");
    expect(rawDraft).toBeTruthy();
    const draft = JSON.parse(rawDraft!);
    expect(draft.step).toBe(1);
    expect(draft.axes.darkness).toBe(70);
    expect(draft.favoriteBooks).toEqual([null, null, null]);
    expect(draft.kryptonite).toBeNull();
  });

  it("для гостя без настроенного настроения CTA-карточка не отображается", () => {
    dnaMock.dna = null;
    renderUi();

    expect(
      screen.queryByText(/Хочешь узнавать совместимость со всеми книгами автоматически\?/i),
    ).toBeNull();
  });
});
