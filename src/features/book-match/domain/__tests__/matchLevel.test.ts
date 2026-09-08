// src/features/book-match/domain/__tests__/matchLevel.test.ts
import { describe, it, expect } from "vitest";
import { matchLevel } from "../matchLevel";

describe("matchLevel", () => {
  it("90–100: ПОПАЛО В ТОЧКУ (emerald)", () => {
    expect(matchLevel(100).label).toBe("ПОПАЛО В ТОЧКУ");
    expect(matchLevel(100).color).toBe("emerald");
    expect(matchLevel(90).label).toBe("ПОПАЛО В ТОЧКУ");
  });

  it("75–89: ПОХОЖЕ, ЭТО ТВОЁ (emerald)", () => {
    expect(matchLevel(89).label).toBe("ПОХОЖЕ, ЭТО ТВОЁ");
    expect(matchLevel(89).color).toBe("emerald");
    expect(matchLevel(75).label).toBe("ПОХОЖЕ, ЭТО ТВОЁ");
  });

  it("55–74: МОЖЕТ СРАБОТАТЬ (amber)", () => {
    expect(matchLevel(74).label).toBe("МОЖЕТ СРАБОТАТЬ");
    expect(matchLevel(74).color).toBe("amber");
    expect(matchLevel(55).label).toBe("МОЖЕТ СРАБОТАТЬ");
  });

  it("35–54: СОМНИТЕЛЬНО (amber)", () => {
    expect(matchLevel(54).label).toBe("СОМНИТЕЛЬНО");
    expect(matchLevel(54).color).toBe("amber");
    expect(matchLevel(35).label).toBe("СОМНИТЕЛЬНО");
  });

  it("0–34: НЕ СЕЙЧАС (rose)", () => {
    expect(matchLevel(34).label).toBe("НЕ СЕЙЧАС");
    expect(matchLevel(34).color).toBe("rose");
    expect(matchLevel(0).label).toBe("НЕ СЕЙЧАС");
    expect(matchLevel(0).color).toBe("rose");
  });

  it("границы между уровнями", () => {
    expect(matchLevel(89).label).toBe("ПОХОЖЕ, ЭТО ТВОЁ");
    expect(matchLevel(90).label).toBe("ПОПАЛО В ТОЧКУ");
    expect(matchLevel(74).label).toBe("МОЖЕТ СРАБОТАТЬ");
    expect(matchLevel(75).label).toBe("ПОХОЖЕ, ЭТО ТВОЁ");
    expect(matchLevel(54).label).toBe("СОМНИТЕЛЬНО");
    expect(matchLevel(55).label).toBe("МОЖЕТ СРАБОТАТЬ");
    expect(matchLevel(34).label).toBe("НЕ СЕЙЧАС");
    expect(matchLevel(35).label).toBe("СОМНИТЕЛЬНО");
  });
});
