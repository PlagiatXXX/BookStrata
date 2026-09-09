// src/features/book-match/domain/__tests__/matchScore.test.ts
import { describe, it, expect } from "vitest";
import { matchScore } from "../matchScore";
import type { ReadingProfile, UserMood } from "../types";

// ─── Эталонные книги (fixture) ──────────────────────────────────────────────

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

const ORWELL_1984: ReadingProfile = {
  storyFocus: 45,
  emotionalWeight: 85,
  pace: 45,
  darkness: 90,
  scope: 70,
  complexity: 65,
  confidence: { storyFocus: 0.9, emotionalWeight: 0.95, pace: 0.85, darkness: 0.95, scope: 0.9, complexity: 0.9 },
  source: "calibrated",
};

const FLOWERS_FOR_ALGERNON: ReadingProfile = {
  storyFocus: 65,
  emotionalWeight: 90,
  pace: 40,
  darkness: 60,
  scope: 55,
  complexity: 70,
  confidence: { storyFocus: 0.9, emotionalWeight: 0.95, pace: 0.85, darkness: 0.9, scope: 0.9, complexity: 0.9 },
  source: "calibrated",
};

const PROUST: ReadingProfile = {
  storyFocus: 95,
  emotionalWeight: 55,
  pace: 90,
  darkness: 40,
  scope: 80,
  complexity: 85,
  confidence: { storyFocus: 0.95, emotionalWeight: 0.85, pace: 0.9, darkness: 0.85, scope: 0.9, complexity: 0.9 },
  source: "calibrated",
};

// ─── Базовые свойства ───────────────────────────────────────────────────────

describe("matchScore — базовые свойства", () => {
  it("возвращает 0 при пустом UserMood", () => {
    expect(matchScore({}, HARRY_POTTER)).toBe(0);
  });

  it("возвращает 100 при идеальном совпадении (book === book)", () => {
    const mood: UserMood = {
      storyFocus: 25,
      emotionalWeight: 20,
      pace: 30,
      darkness: 15,
    };
    expect(matchScore(mood, HARRY_POTTER)).toBe(100);
  });

  it("всегда возвращает число от 0 до 100", () => {
    const tests: [UserMood, ReadingProfile][] = [
      [{ storyFocus: 0 }, HARRY_POTTER],
      [{ storyFocus: 100 }, ORWELL_1984],
      [{ darkness: 0 }, FLOWERS_FOR_ALGERNON],
      [{ darkness: 100 }, PROUST],
      [{ storyFocus: 50, emotionalWeight: 50, pace: 50, darkness: 50 }, HARRY_POTTER],
    ];
    for (const [user, book] of tests) {
      const score = matchScore(user, book);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("чем дальше user от book, тем ниже score", () => {
    const near = matchScore({ darkness: 80 }, ORWELL_1984);
    const far = matchScore({ darkness: 10 }, ORWELL_1984);
    expect(near).toBeGreaterThan(far);
  });

  it("порядок осей не влияет на результат", () => {
    const a = matchScore({ storyFocus: 30, darkness: 70 }, HARRY_POTTER);
    const b = matchScore({ darkness: 70, storyFocus: 30 }, HARRY_POTTER);
    expect(a).toBe(b);
  });
});

// ─── Одна активная ось ──────────────────────────────────────────────────────

describe("matchScore — одна активная ось", () => {
  it("считает только по одной оси с нормализацией весов (сигмоид)", () => {
    // darkness: пользователь хочет 90, книга (Поттер) = 15
    // perceptual(90)≈97.3, perceptual(15)≈4.1
    // similarity = 1 - |97.3-4.1|/100 = 0.068 → 7
    // Одна ось → вес нормализуется к 1.0
    const score = matchScore({ darkness: 90 }, HARRY_POTTER);
    expect(score).toBeLessThanOrEqual(10);
  });

  it("совпадение одной оси на 100% → 100", () => {
    const score = matchScore({ darkness: 15 }, HARRY_POTTER);
    expect(score).toBe(100);
  });

  it("совпадение одной оси на 0% → близко к 0 (сигмоид сжимает края)", () => {
    // user=0, book=100 → perceptual(0)≈0.8, perceptual(100)≈99.2
    // similarity = 1 - 98.4/100 = 0.016 → 2 (не 0 из-за сигмоида)
    const score = matchScore({ darkness: 0 }, { ...HARRY_POTTER, darkness: 100 });
    expect(score).toBeLessThanOrEqual(5);
  });
});

// ─── Несколько активных осей ────────────────────────────────────────────────

describe("matchScore — несколько активных осей", () => {
  it("нормализует веса пропорционально количеству активных осей", () => {
    // storyFocus + darkness: веса 0.25 + 0.25 = 0.50
    // Нормализация: storyFocus → 0.50, darkness → 0.50
    const score = matchScore(
      { storyFocus: 25, darkness: 15 },
      HARRY_POTTER,
    );
    expect(score).toBe(100);
  });

  it("среднее двух осей с разным совпадением (сигмоид)", () => {
    // storyFocus: user=25, book=25 → perceptual(25)≈12.2, perceptual(25)≈12.2 → similarity=1.0
    // darkness: user=80, book=15 → perceptual(80)≈87.8, perceptual(15)≈6.2
    //   similarity = 1 - |87.8-6.2|/100 = 1 - 0.816 = 0.184
    // Веса: storyFocus=0.25, darkness=0.25 → нормализованы к 0.5/0.5
    // score = (1.0 * 0.5 + 0.184 * 0.5) * 100 ≈ 59
    const score = matchScore(
      { storyFocus: 25, darkness: 80 },
      HARRY_POTTER,
    );
    expect(score).toBeGreaterThanOrEqual(55);
    expect(score).toBeLessThanOrEqual(65);
  });
});

// ─── Все 6 осей ──────────────────────────────────────────────────────────────

describe("matchScore — все 6 осей", () => {
  it("считает полный score со всеми осями", () => {
    // Идеально подходит под Поттера
    const mood: UserMood = {
      storyFocus: 25,
      emotionalWeight: 20,
      pace: 30,
      darkness: 15,
    };
    expect(matchScore(mood, HARRY_POTTER)).toBe(100);
  });

  it("Поттер vs Пруст — невысокое совпадение (сигмоид)", () => {
    const mood: UserMood = {
      storyFocus: 25,
      emotionalWeight: 20,
      pace: 30,
      darkness: 15,
    };
    const score = matchScore(mood, PROUST);
    // storyFocus: perceptual(25)≈12.2 vs perceptual(95)≈94.2 → sim=0.18
    // emotionalWeight: perceptual(20)≈9.0 vs perceptual(55)≈50.0 → sim=0.59
    // pace: perceptual(30)≈15.7 vs perceptual(90)≈92.0 → sim=0.24
    // darkness: perceptual(15)≈6.2 vs perceptual(40)≈31.0 → sim=0.75
    // weighted: 0.18*0.25 + 0.59*0.3 + 0.24*0.2 + 0.75*0.25 ≈ 0.45 → 45
    expect(score).toBeGreaterThanOrEqual(35);
    expect(score).toBeLessThanOrEqual(55);
  });

  it("Поттер vs 1984 — среднее совпадение", () => {
    const mood: UserMood = {
      storyFocus: 25,
      emotionalWeight: 20,
      pace: 30,
      darkness: 15,
    };
    const score = matchScore(mood, ORWELL_1984);
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThan(70);
  });
});
