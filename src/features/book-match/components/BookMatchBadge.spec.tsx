import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const dnaMock = vi.hoisted(() => ({
  dna: null as {
    archetypeName: string;
    axes: {
      storyFocus: number;
      emotionalWeight: number;
      pace: number;
      darkness: number;
      scope: number;
      complexity: number;
    };
  } | null,
}));

vi.mock("@/hooks/useMyReadingDna", () => ({
  useMyReadingDna: () => ({ dna: dnaMock.dna }),
}));

vi.mock("../hooks/useStoredMood", () => ({
  readStoredMood: vi.fn(),
}));

import { BookMatchBadge } from "./BookMatchBadge";
import { readStoredMood } from "../hooks/useStoredMood";
import type { ReadingProfile, UserMood } from "../domain/types";

const BOOK: ReadingProfile = {
  storyFocus: 20,
  emotionalWeight: 30,
  pace: 80,
  darkness: 90,
  scope: 50,
  complexity: 60,
  confidence: { storyFocus: 0.9, emotionalWeight: 0.9, pace: 0.9, darkness: 0.9, scope: 0.9, complexity: 0.9 },
  source: "ai",
};

function mockMood(mood: UserMood) {
  vi.mocked(readStoredMood).mockReturnValue(mood);
}

describe("BookMatchBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dnaMock.dna = null;
    mockMood({});
  });

  afterEach(() => {
    const elem = document.getElementById("book-match");
    if (elem) elem.remove();
  });

  it("рендерит подсказку для скролла, если нет ни ДНК, ни настроения", () => {
    render(<BookMatchBadge book={BOOK} />);
    expect(screen.getByText(/узнать совместимость с твоим вкусом/i)).toBeInTheDocument();
  });

  it("рендерит подсказку для скролла для гостя при score < 75 (не скрывается насовсем)", () => {
    mockMood({ storyFocus: 100, emotionalWeight: 100, pace: 0, darkness: 0 }); // противоположность
    render(<BookMatchBadge book={BOOK} />);
    expect(screen.getByText(/узнать совместимость с твоим вкусом/i)).toBeInTheDocument();
  });

  it("рендерит совместимость с настроением для гостя при score ≥ 75", () => {
    mockMood({ storyFocus: 20, emotionalWeight: 30, pace: 80, darkness: 90 });
    render(<BookMatchBadge book={BOOK} />);
    expect(screen.getByText(/подходит под твоё настроение/i)).toBeInTheDocument();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it("рендерит совместимость с ДНК и архетип при высоком score (emerald)", () => {
    dnaMock.dna = {
      archetypeName: "Архивариус Бездны",
      axes: { storyFocus: 20, emotionalWeight: 30, pace: 80, darkness: 90, scope: 50, complexity: 60 },
    };
    render(<BookMatchBadge book={BOOK} />);
    expect(screen.getByText(/совместимость с твоим днк/i)).toBeInTheDocument();
    expect(screen.getByText(/Архивариус Бездны/)).toBeInTheDocument();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it("рендерит бейдж ДНК с янтарным стилем при среднем совпадении (50-74%)", () => {
    dnaMock.dna = {
      archetypeName: "Визионер",
      axes: { storyFocus: 50, emotionalWeight: 60, pace: 40, darkness: 50, scope: 50, complexity: 50 },
    };
    render(<BookMatchBadge book={BOOK} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-amber-400");
  });

  it("рендерит бейдж ДНК с приглушенным стилем при низком совпадении (<50%)", () => {
    dnaMock.dna = {
      archetypeName: "Гедонист",
      axes: { storyFocus: 100, emotionalWeight: 100, pace: 0, darkness: 0, scope: 0, complexity: 0 },
    };
    render(<BookMatchBadge book={BOOK} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-white/60");
  });

  it("скроллит к блоку #book-match при клике", () => {
    const scrollIntoViewMock = vi.fn();
    const elem = document.createElement("div");
    elem.id = "book-match";
    elem.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(elem);

    dnaMock.dna = {
      archetypeName: "Визионер",
      axes: { storyFocus: 20, emotionalWeight: 30, pace: 80, darkness: 90, scope: 50, complexity: 60 },
    };

    render(<BookMatchBadge book={BOOK} />);
    fireEvent.click(screen.getByRole("button"));
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("не падает с ошибкой при клике, если #book-match отсутствует в DOM", () => {
    dnaMock.dna = {
      archetypeName: "Визионер",
      axes: { storyFocus: 20, emotionalWeight: 30, pace: 80, darkness: 90, scope: 50, complexity: 60 },
    };

    render(<BookMatchBadge book={BOOK} />);
    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
  });
});
