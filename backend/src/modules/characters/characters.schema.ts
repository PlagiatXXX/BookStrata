// backend/src/modules/characters/characters.schema.ts
import { z } from "zod";
import { parseAiJson } from "../../utils/aiJson.js";

export const CHARACTER_ROLE_VALUES = [
  "protagonist",
  "antagonist",
  "supporting",
  "minor",
] as const;

export type CharacterRoleValue = (typeof CHARACTER_ROLE_VALUES)[number];

const ROLE_NORMALIZE: Record<string, CharacterRoleValue> = {
  protagonist: "protagonist",
  "главный герой": "protagonist",
  "главная героиня": "protagonist",
  "протагонист": "protagonist",
  antagonist: "antagonist",
  "антагонист": "antagonist",
  "злодей": "antagonist",
  "главный злодей": "antagonist",
  supporting: "supporting",
  "ключевой": "supporting",
  "ключевой персонаж": "supporting",
  "спутник": "supporting",
  "союзник": "supporting",
  minor: "minor",
  "второстепенный": "minor",
  "второстепенный персонаж": "minor",
};

/**
 * Нормализует объект персонажа до Zod-валидации:
 * - приводим синонимы роли к enum CharacterRole;
 * - пустой/пробельный universeSlug приводим к null.
 */
function normalizeCharacterInput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return raw;
  }
  const obj = { ...(raw as Record<string, unknown>) };
  if (typeof obj.role === "string") {
    const key = obj.role.trim().toLowerCase();
    obj.role = ROLE_NORMALIZE[key] ?? obj.role.trim();
  }
  if (typeof obj.universeSlug === "string" && obj.universeSlug.trim() === "") {
    obj.universeSlug = null;
  }
  return obj;
}

export const characterRelationInputSchema = z.object({
  targetName: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(60),
});

export const bookCharacterInputSchema = z.preprocess(
  normalizeCharacterInput,
  z.object({
    characterId: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(120),
    aliases: z
      .array(z.string().trim().min(1).max(120))
      .max(8)
      .nullish()
      .transform((v) => v ?? []),
    universeSlug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80)
      .nullable()
      .optional(),
    role: z.enum(CHARACTER_ROLE_VALUES),
    summary: z.string().trim().min(10).max(500),
    traits: z
      .array(z.string().trim().min(1).max(40))
      .max(5)
      .nullish()
      .transform((v) => v ?? []),
    sortOrder: z.number().int().min(0).max(1000).optional(),
    relations: z
      .array(characterRelationInputSchema)
      .max(10)
      .nullish()
      .transform((v) => v ?? []),
  }),
);

export type BookCharacterInput = z.infer<typeof bookCharacterInputSchema>;

export const bookCharactersListSchema = z.array(bookCharacterInputSchema).max(20);

/** Парсит и валидирует JSON-массив персонажей из ответа ИИ. */
export function sanitizeAndParseAiCharacters(raw: string): BookCharacterInput[] {
  const parsed: unknown = parseAiJson(raw);
  // Список сохранения допускает [] для очистки героев книги, AI-импорт требует минимум 1 героя
  return bookCharactersListSchema.min(1).parse(parsed);
}
