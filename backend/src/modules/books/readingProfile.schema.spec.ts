import { describe, it, expect } from "vitest";
import { validateReadingProfile, readingProfileSchema } from "./readingProfile.schema.js";

const OLD_PROFILE = {
  storyFocus: 20,
  emotionalWeight: 30,
  pace: 80,
  darkness: 90,
  confidence: { storyFocus: 0.9, emotionalWeight: 0.9, pace: 0.9, darkness: 0.9 },
  source: "ai",
};

describe("readingProfileSchema — genreConfidence", () => {
  it("старый профиль без поля валидируется, genreConfidence = 0.5", () => {
    const parsed = validateReadingProfile(OLD_PROFILE);
    expect(parsed.genreConfidence).toBe(0.5);
  });

  it("явное значение сохраняется", () => {
    const parsed = readingProfileSchema.parse({ ...OLD_PROFILE, genreConfidence: 0.87 });
    expect(parsed.genreConfidence).toBe(0.87);
  });

  it("вне 0–1 — ошибка", () => {
    expect(() => readingProfileSchema.parse({ ...OLD_PROFILE, genreConfidence: 1.5 })).toThrow();
    expect(() => readingProfileSchema.parse({ ...OLD_PROFILE, genreConfidence: -0.1 })).toThrow();
  });
});
