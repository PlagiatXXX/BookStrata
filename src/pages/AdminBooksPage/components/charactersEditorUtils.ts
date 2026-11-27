// src/pages/AdminBooksPage/components/charactersEditorUtils.ts
// Утилиты, константы, валидация и нормализация персонажей книги для админки.

import type { BookCharacterInput } from "@/lib/adminBooksApi";
import type { BookCharacterView, CharacterRole } from "@/lib/bookApi";
import { parseAiJson } from "@/utils/aiJson";

export const ROLE_OPTIONS: Array<{ value: CharacterRole; label: string }> = [
  { value: "protagonist", label: "Главный герой" },
  { value: "antagonist", label: "Антагонист" },
  { value: "supporting", label: "Ключевой" },
  { value: "minor", label: "Второстепенный" },
];

export const ROLE_NORMALIZE: Record<string, CharacterRole> = {
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

export const UNIVERSE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createEmptyCharacter(): BookCharacterInput {
  return {
    name: "",
    aliases: [],
    universeSlug: null,
    role: "supporting",
    summary: "",
    traits: [],
    relations: [],
  };
}

export function toCharacterInputs(
  views?: BookCharacterView[],
): BookCharacterInput[] {
  return (views ?? []).map((c, idx) => ({
    characterId: c.characterId,
    name: c.name,
    aliases: c.aliases ?? [],
    universeSlug: c.universeSlug ?? null,
    role: c.role,
    summary: c.summary,
    traits: c.traits ?? [],
    sortOrder: idx,
    relations: (c.relations ?? []).map((r) => ({
      targetName: r.targetName,
      label: r.label,
    })),
  }));
}

export function normalizeCharactersForSave(
  items: BookCharacterInput[],
): BookCharacterInput[] {
  return items.map((item, idx) => ({
    ...(item.characterId !== undefined ? { characterId: item.characterId } : {}),
    name: item.name.trim(),
    aliases: item.aliases.map((a) => a.trim()).filter(Boolean),
    universeSlug: item.universeSlug?.trim() || null,
    role: item.role,
    summary: item.summary.trim(),
    traits: item.traits.map((t) => t.trim()).filter(Boolean),
    sortOrder: idx,
    relations: item.relations.map((r) => ({
      targetName: r.targetName.trim(),
      label: r.label.trim(),
    })),
  }));
}

/**
 * Проверяет список персонажей книги перед сохранением (синхронно с Zod-схемой бэкенда).
 * Возвращает понятную ошибку на русском или null, если всё валидно.
 */
export function validateBookCharacters(
  items: BookCharacterInput[],
): string | null {
  if (items.length > 20) {
    return "Максимум 20 персонажей в одной книге";
  }

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const name = item.name.trim();
    const label = name || `Персонаж #${i + 1}`;

    if (!name) {
      return `Персонаж #${i + 1}: укажите имя`;
    }
    if (name.length > 120) {
      return `${label}: имя не должно превышать 120 символов`;
    }

    const summaryLen = item.summary.trim().length;
    if (summaryLen < 10 || summaryLen > 500) {
      return `${label}: описание должно содержать от 10 до 500 символов (сейчас ${summaryLen})`;
    }

    const slug = item.universeSlug?.trim() ?? "";
    if (slug && (slug.length > 80 || !UNIVERSE_SLUG_RE.test(slug))) {
      return `${label}: невалидный slug вселенной (допустимы строчная латиница, цифры и дефисы)`;
    }

    if (item.aliases.length > 8) {
      return `${label}: не более 8 алиасов`;
    }
    for (const alias of item.aliases) {
      if (alias.trim().length > 120) {
        return `${label}: каждый алиас не должен превышать 120 символов`;
      }
    }

    if (item.traits.length > 5) {
      return `${label}: не более 5 черт характера`;
    }
    for (const trait of item.traits) {
      if (trait.trim().length > 40) {
        return `${label}: каждая черта характера не должна превышать 40 символов`;
      }
    }

    if (item.relations.length > 10) {
      return `${label}: не более 10 связей`;
    }
    for (const rel of item.relations) {
      const targetName = rel.targetName.trim();
      const relLabel = rel.label.trim();
      if (!targetName || !relLabel) {
        return `${label}: у каждой связи должны быть заполнены персонаж и тип связи`;
      }
      if (targetName.length > 120) {
        return `${label}: имя связанного персонажа не должно превышать 120 символов`;
      }
      if (relLabel.length > 60) {
        return `${label}: описание связи не должно превышать 60 символов`;
      }
    }
  }

  return null;
}

export function parseAiCharactersJson(raw: string): {
  items?: BookCharacterInput[];
  error?: string;
} {
  let parsed: unknown;
  try {
    parsed = parseAiJson(raw);
  } catch {
    return { error: "Невалидный JSON: проверьте синтаксис, кавычки и скобки" };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: "Ожидается непустой JSON-массив персонажей" };
  }
  if (parsed.length > 20) {
    return { error: "В массиве не может быть больше 20 персонажей" };
  }

  const normalized: BookCharacterInput[] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const entry = parsed[i];
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return { error: `Элемент #${i + 1} должен быть JSON-объектом` };
    }
    const obj = entry as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name.trim() : "";
    if (!name) {
      return { error: `Персонаж #${i + 1}: отсутствует непустое поле name` };
    }

    const rawRole =
      typeof obj.role === "string" ? obj.role.trim().toLowerCase() : "";
    const role = ROLE_NORMALIZE[rawRole];
    if (!role) {
      return {
        error: `${name}: недопустимая роль "${String(obj.role ?? "")}"`,
      };
    }

    if (typeof obj.summary !== "string") {
      return { error: `${name}: отсутствует строковое поле summary` };
    }

    const aliases = Array.isArray(obj.aliases)
      ? obj.aliases
          .map((a) => (typeof a === "string" ? a.trim() : ""))
          .filter(Boolean)
          .slice(0, 8)
      : [];

    const traits = Array.isArray(obj.traits)
      ? obj.traits
          .map((t) => (typeof t === "string" ? t.trim() : ""))
          .filter(Boolean)
          .slice(0, 5)
      : [];

    const rawSlug =
      typeof obj.universeSlug === "string" ? obj.universeSlug.trim() : "";
    const universeSlug = rawSlug || null;

    const relations: Array<{ targetName: string; label: string }> = [];
    if (Array.isArray(obj.relations)) {
      for (const rel of obj.relations.slice(0, 10)) {
        if (typeof rel !== "object" || rel === null || Array.isArray(rel)) {
          return { error: `${name}: некорректная структура в relations` };
        }
        const r = rel as Record<string, unknown>;
        const targetName =
          typeof r.targetName === "string" ? r.targetName.trim() : "";
        const label = typeof r.label === "string" ? r.label.trim() : "";
        if (!targetName || !label) {
          return {
            error: `${name}: у связи должны быть поля targetName и label`,
          };
        }
        relations.push({ targetName, label });
      }
    }

    normalized.push({
      name,
      aliases,
      universeSlug,
      role,
      traits,
      summary: obj.summary.trim(),
      relations,
    });
  }

  const validationError = validateBookCharacters(normalized);
  if (validationError) {
    return { error: validationError };
  }

  return { items: normalized };
}
