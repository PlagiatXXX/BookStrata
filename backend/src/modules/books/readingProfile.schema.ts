// backend/src/modules/books/readingProfile.schema.ts
// Zod-схема Reading DNA (Book.readingProfile, Json).
// Нормализованные значения по 4 осям + confidence + source.

import { z } from "zod";

/** Оси совместимости (0–100). */
const axisValue = z.number().min(0).max(100);

export const readingProfileSchema = z.object({
  storyFocus: axisValue,
  emotionalWeight: axisValue,
  pace: axisValue,
  darkness: axisValue,

  confidence: z.object({
    storyFocus: z.number().min(0).max(1),
    emotionalWeight: z.number().min(0).max(1),
    pace: z.number().min(0).max(1),
    darkness: z.number().min(0).max(1),
  }),

  source: z.enum(["ai", "manual", "calibrated"]),
});

export type ReadingProfile = z.infer<typeof readingProfileSchema>;

/** Валидация readingProfile из JSON. Бросает ZodError при невалидной структуре. */
export function validateReadingProfile(raw: unknown): ReadingProfile {
  return readingProfileSchema.parse(raw);
}
