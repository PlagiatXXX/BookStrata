import { describe, it, expect } from "vitest";
import { perceptual, perceptualInverse } from "./perceptualScale";

describe("perceptual (sigmoid mapping)", () => {
  it("50 → 50 (центр фиксирован)", () => {
    expect(perceptual(50)).toBe(50);
  });

  it("0 → близко к 0", () => {
    expect(perceptual(0)).toBeLessThan(5);
  });

  it("100 → близко к 100", () => {
    expect(perceptual(100)).toBeGreaterThan(95);
  });

  it("монотонно возрастает", () => {
    const values = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(perceptual);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it("середина чувствительнее краёв (S-образная)", () => {
    // Разница в середине (45→55) должна быть больше, чем на краях (5→15 или 85→95)
    const midDelta = perceptual(55) - perceptual(45);
    const leftDelta = perceptual(15) - perceptual(5);
    const rightDelta = perceptual(95) - perceptual(85);
    expect(midDelta).toBeGreaterThan(leftDelta);
    expect(midDelta).toBeGreaterThan(rightDelta);
  });

  it("все значения в диапазоне 0–100", () => {
    for (let v = 0; v <= 100; v += 5) {
      const result = perceptual(v);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    }
  });
});

describe("perceptualInverse (обратное преобразование)", () => {
  it("perceptualInverse(perceptual(x)) ≈ x", () => {
    for (let v = 0; v <= 100; v += 10) {
      const roundtrip = perceptualInverse(perceptual(v));
      expect(roundtrip).toBeCloseTo(v, 0);
    }
  });
});
