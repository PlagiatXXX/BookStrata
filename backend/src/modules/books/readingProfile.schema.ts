// backend/src/modules/books/readingProfile.schema.ts
// Zod-схема Reading DNA (Book.readingProfile, Json).
// Нормализованные значения по 6 осям + confidence + source.

import { z } from "zod";

/** Оси совместимости (0–100). */
const axisValue = z.number().min(0).max(100);

export const readingProfileSchema = z.object({
  storyFocus: axisValue,
  emotionalWeight: axisValue,
  pace: axisValue,
  darkness: axisValue,
  scope: axisValue.optional().default(50),
  complexity: axisValue.optional().default(50),

  confidence: z.object({
    storyFocus: z.number().min(0).max(1),
    emotionalWeight: z.number().min(0).max(1),
    pace: z.number().min(0).max(1),
    darkness: z.number().min(0).max(1),
    scope: z.number().min(0).max(1).optional().default(0.5),
    complexity: z.number().min(0).max(1).optional().default(0.5),
  }),

  source: z.enum(["ai", "manual", "calibrated"]),
});

export type ReadingProfile = z.infer<typeof readingProfileSchema>;

/** Валидация readingProfile из JSON. Бросает ZodError при невалидной структуре. */
export function validateReadingProfile(raw: unknown): ReadingProfile {
  return readingProfileSchema.parse(raw);
}
