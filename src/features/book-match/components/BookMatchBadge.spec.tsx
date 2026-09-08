import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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
  confidence: { storyFocus: 0.9, emotionalWeight: 0.9, pace: 0.9, darkness: 0.9 },
  source: "ai",
};

function mockMood(mood: UserMood) {
  vi.mocked(readStoredMood).mockReturnValue(mood);
}

describe("BookMatchBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMood({});
  });

  it("ничего не рендерит без сохранённого настроения", () => {
    const { container } = render(<BookMatchBadge book={BOOK} />);
    expect(container.firstChild).toBeNull();
  });

  it("рендерит бейдж при score ≥ 75 с процентом", () => {
    mockMood({ storyFocus: 20, emotionalWeight: 30, pace: 80, darkness: 90 }); // идеал → 100
    render(<BookMatchBadge book={BOOK} />);
    expect(screen.getByText(/подходит под твоё настроение/i)).toBeDefined();
    expect(screen.getByText(/100%/)).toBeDefined();
  });

  it("скрыт при score < 75 (сомнительное совпадение не хвалим)", () => {
    mockMood({ storyFocus: 100, emotionalWeight: 100, pace: 0, darkness: 0 }); // противоположность
    const { container } = render(<BookMatchBadge book={BOOK} />);
    expect(container.firstChild).toBeNull();
  });
});
