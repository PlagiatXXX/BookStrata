// backend/src/modules/books/readingGuide.schema.ts
// Zod-схема AI-паспорта «Гид по чтению» (Book.readingGuide, Json).
// Значения темпа/сложности — строгие enum'ы: промпт оператора фиксирует
// допустимые варианты, чтобы ИИ не плодил разнобой («легко читается»,
// «простое» и т.п.). Валидация едина для admin PATCH и bulk-импорта.

import { z } from "zod";

/** Допустимые значения темпа чтения */
export const READING_PACE_VALUES = [
  "Динамичный",
  "Размеренный",
  "Медитативный",
] as const;

/** Допустимые значения сложности */
export const DIFFICULTY_VALUES = [
  "Легкое чтение",
  "Средняя сложность",
  "Высокий порог входа",
] as const;

export const readingGuideSchema = z.object({
  /** Суть книги одним предложением (до 15 слов, панчлайн) */
  short_hook: z.string().min(5).max(300),
  /** Кому понравится (1–2 предложения о трюках и читательских вкусах) */
  target_audience: z.string().min(10).max(1000),
  /** Кому лучше пропустить (чего здесь точно нет) */
  not_recommended_for: z.string().min(10).max(1000),
  reading_pace: z.enum(READING_PACE_VALUES),
  difficulty: z.enum(DIFFICULTY_VALUES),
  /** Настроение книги: 1–2 слова */
  vibe: z.string().min(2).max(100),
  /** Смысловые акценты книги */
  key_takeaways: z.array(z.string().min(3).max(500)).min(1).max(3),
});

export type ReadingGuide = z.infer<typeof readingGuideSchema>;

/**
 * Парсит ответ внешнего ИИ: срезает markdown-обёртку ```json ... ```
 * (или ``` ... ```), затем JSON.parse + zod-валидация структуры.
 * Бросает SyntaxError при битом JSON и ZodError при невалидной структуре.
 */
export function sanitizeAndParseReadingGuide(raw: string): ReadingGuide {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "");
  }
  const parsed: unknown = JSON.parse(cleaned);
  return readingGuideSchema.parse(parsed);
}
