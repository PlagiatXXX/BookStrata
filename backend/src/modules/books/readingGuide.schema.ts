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

/**
 * Нормализует варианты, которые любит ИИ, к каноническим enum-значениям.
 * «Быстрый» → «Динамичный», «Легко» → «Легкое чтение» и т.п.
 * Неизвестные значения не трогаем — их отсечёт z.enum с понятной ошибкой.
 */
const PACE_NORMALIZE: Record<string, (typeof READING_PACE_VALUES)[number]> = {
  "динамичный": "Динамичный",
  "быстрый": "Динамичный",
  "быстрая": "Динамичный",
  "размеренный": "Размеренный",
  "умеренный": "Размеренный",
  "спокойный": "Размеренный",
  "медитативный": "Медитативный",
  "медленный": "Медитативный",
  "медленная": "Медитативный",
  "тягучий": "Медитативный",
};

const DIFFICULTY_NORMALIZE: Record<string, (typeof DIFFICULTY_VALUES)[number]> = {
  "легкое чтение": "Легкое чтение",
  "лёгкое чтение": "Легкое чтение",
  "легко": "Легкое чтение",
  "лёгкая сложность": "Легкое чтение",
  "легкая сложность": "Легкое чтение",
  "средняя сложность": "Средняя сложность",
  "средне": "Средняя сложность",
  "средний": "Средняя сложность",
  "высокий порог входа": "Высокий порог входа",
  "сложно": "Высокий порог входа",
  "высокая сложность": "Высокий порог входа",
  "тяжело": "Высокий порог входа",
};

/** Приводит reading_pace/difficulty к канону до zod-валидации. */
function normalizeGuideValues(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  if (typeof obj.reading_pace === "string") {
    obj.reading_pace = PACE_NORMALIZE[obj.reading_pace.trim().toLowerCase()] ?? obj.reading_pace;
  }
  if (typeof obj.difficulty === "string") {
    obj.difficulty = DIFFICULTY_NORMALIZE[obj.difficulty.trim().toLowerCase()] ?? obj.difficulty;
  }
  // Backward compatibility: not_recommended_for → friction_points
  if ("not_recommended_for" in obj && !("friction_points" in obj)) {
    obj.friction_points = obj.not_recommended_for;
    delete obj.not_recommended_for;
  }
  return obj;
}

export const readingGuideSchema = z.preprocess(normalizeGuideValues, z.object({
  /** Суть книги одним предложением (до 15 слов, панчлайн) */
  short_hook: z.string().min(5).max(300),
  /** Кому понравится (1–2 предложения о трюках и читательских вкусах) */
  target_audience: z.string().min(10).max(1000),
  /** Точки трения: конкретные элементы, которые могут оттолкнуть */
  friction_points: z.string().min(10).max(1000),
  reading_pace: z.enum(READING_PACE_VALUES),
  difficulty: z.enum(DIFFICULTY_VALUES),
  /** Настроение книги: 1–2 слова */
  vibe: z.string().min(2).max(100),
  /** Смысловые акценты книги */
  key_takeaways: z.array(z.string().min(3).max(500)).min(1).max(3),
}));

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
