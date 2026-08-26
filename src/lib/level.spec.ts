import { describe, it, expect } from "vitest";
import { XP_PER_LEVEL, levelFromXp, xpProgress } from "./level";

describe("level", () => {
  it("уровень 1 при 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("2205 XP → уровень 23, прогресс 5, до следующего 95", () => {
    expect(levelFromXp(2205)).toBe(23);
    expect(xpProgress(2205)).toBe(5);
    expect(XP_PER_LEVEL - xpProgress(2205)).toBe(95);
  });
});
