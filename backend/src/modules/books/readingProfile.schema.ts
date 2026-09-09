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

  // CoT-поля (опциональны, для backward-совместимости)
  analysis: z.string().optional(),
  knowledgeSource: z.enum(["world_knowledge", "annotation_only"]).optional(),
});

export type ReadingProfile = z.infer<typeof readingProfileSchema>;

/**
 * Очищает строку analysis от некорректных кавычек,
 * которые модель может сгенерировать внутри JSON.
 * Проблема: "Герой ищет "смысл жизни"" → ломает JSON-парсер.
 * Решение: заменяем незакрытые кавычки на ёлочки.
 */
function sanitizeAnalysis(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.analysis === "string") {
    // Заменяем прямые двойные кавычки внутри текста на ёлочки
    obj.analysis = obj.analysis
      .replace(/(?<!\\)"/g, "«")
      .replace(/«([^«»]*)$/g, "«$1»");
  }
  return obj;
}

/**
 * Валидация readingProfile из JSON. Бросает ZodError при невалидной структуре.
 * Перед валидацией очищает analysis от проблемных кавычек.
 */
export function validateReadingProfile(raw: unknown): ReadingProfile {
  return readingProfileSchema.parse(sanitizeAnalysis(raw));
}
