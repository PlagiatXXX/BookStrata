// src/features/book-match/domain/__tests__/explainMatch.test.ts
import { describe, it, expect } from "vitest";
import { explainMatch } from "../explainMatch";
import type { ReadingProfile } from "../types";

const HARRY_POTTER: ReadingProfile = {
  storyFocus: 25,
  emotionalWeight: 20,
  pace: 30,
  darkness: 15,
  scope: 40,
  complexity: 35,
  confidence: { storyFocus: 0.95, emotionalWeight: 0.95, pace: 0.9, darkness: 0.95, scope: 0.9, complexity: 0.9 },
  source: "calibrated",
};

describe("explainMatch", () => {
  it("возвращает diffs для всех активных осей", () => {
    const result = explainMatch(
      { storyFocus: 25, darkness: 15 },
      HARRY_POTTER,
    );
    expect(result.diffs).toHaveLength(2);
    expect(result.diffs.map((d: { axis: string }) => d.axis)).toContain("storyFocus");
    expect(result.diffs.map((d: { axis: string }) => d.axis)).toContain("darkness");
  });

  it("не в diffs для неактивных осей", () => {
    const result = explainMatch(
      { storyFocus: 25 },
      HARRY_POTTER,
    );
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0].axis).toBe("storyFocus");
  });

  it("matches — оси с разницей < 20", () => {
    const result = explainMatch(
      { storyFocus: 30, darkness: 20 },
      HARRY_POTTER,
    );
    // storyFocus: |30-25|=5 → match
    // darkness: |20-15|=5 → match
    expect(result.matches).toHaveLength(2);
    expect(result.matches.map((d: { axis: string }) => d.axis)).toContain("storyFocus");
    expect(result.matches.map((d: { axis: string }) => d.axis)).toContain("darkness");
  });

  it("mismatches — оси с разницей > 29", () => {
    const result = explainMatch(
      { storyFocus: 25, darkness: 80 },
      HARRY_POTTER,
    );
    // darkness: |80-15|=65 → mismatch
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0].axis).toBe("darkness");
  });

  it("diff правильный: bookValue - userValue", () => {
    const result = explainMatch(
      { darkness: 80 },
      HARRY_POTTER,
    );
    // book=15, user=80 → diff = 15 - 80 = -65
    expect(result.diffs[0].diff).toBe(-65);
    expect(result.diffs[0].absDiff).toBe(65);
  });

  it("direction описывает расхождение", () => {
    const result = explainMatch(
      { darkness: 80 },
      HARRY_POTTER,
    );
    // darkness: user=80, book=15 → книга светлее
    expect(result.diffs[0].direction).toContain("светлее");
  });

  it("все 6 осей — полный набор diffs", () => {
    const result = explainMatch(
      { storyFocus: 50, emotionalWeight: 50, pace: 50, darkness: 50, scope: 50, complexity: 50 },
      HARRY_POTTER,
    );
    expect(result.diffs).toHaveLength(6);
  });

  it("среднее расхождение — корректно", () => {
    const result = explainMatch(
      { storyFocus: 25, darkness: 15 },
      HARRY_POTTER,
    );
    // storyFocus: |25-25|=0, darkness: |15-15|=0 → average=0
    expect(result.averageDifference).toBe(0);
  });
});
