// backend/src/modules/characters/characters.schema.spec.ts
import { describe, it, expect } from "vitest";
import {
  bookCharacterInputSchema,
  bookCharactersListSchema,
  sanitizeAndParseAiCharacters,
} from "./characters.schema.js";

const validSummary =
  "Ведьмак-мутант, охотник на чудовищ, ищущий баланс между заказами и совестью.";

function makeCharacter(overrides: Record<string, unknown> = {}) {
  return {
    name: "Геральт",
    role: "protagonist",
    summary: validSummary,
    ...overrides,
  };
}

describe("characters.schema", () => {
  it("нормализует русские синонимы ролей, регистр и пробелы к enum CharacterRole", () => {
    const parsed = bookCharactersListSchema.parse([
      makeCharacter({
        role: "  Главный Герой  ",
        traits: ["стоический", "циничный"],
      }),
      makeCharacter({
        name: "Вильгефорц",
        role: "ЗЛОДЕЙ",
      }),
      makeCharacter({
        name: "Лютик",
        role: " Спутник ",
      }),
      makeCharacter({
        name: "Золтан",
        role: "Союзник",
      }),
      makeCharacter({
        name: "Стражник",
        role: " Второстепенный персонаж ",
      }),
    ]);

    expect(parsed[0].role).toBe("protagonist");
    expect(parsed[1].role).toBe("antagonist");
    expect(parsed[1].traits).toEqual([]);
    expect(parsed[2].role).toBe("supporting");
    expect(parsed[3].role).toBe("supporting");
    expect(parsed[4].role).toBe("minor");
  });

  it("допускает пустой массив [] для bookCharactersListSchema (очистка героев книги)", () => {
    expect(bookCharactersListSchema.parse([])).toEqual([]);
  });

  it("отклоняет пробельные строки в aliases, traits, summary и relations", () => {
    expect(() =>
      bookCharacterInputSchema.parse(makeCharacter({ aliases: ["   "] })),
    ).toThrow();
    expect(() =>
      bookCharacterInputSchema.parse(makeCharacter({ traits: [" \t "] })),
    ).toThrow();
    expect(() =>
      bookCharacterInputSchema.parse(makeCharacter({ summary: "         " })),
    ).toThrow();
    expect(() =>
      bookCharacterInputSchema.parse(
        makeCharacter({ relations: [{ targetName: "   ", label: "друг" }] }),
      ),
    ).toThrow();
    expect(() =>
      bookCharacterInputSchema.parse(
        makeCharacter({ relations: [{ targetName: "Лютик", label: "  " }] }),
      ),
    ).toThrow();
  });

  it("валидирует universeSlug и преобразует пустую/пробельную строку в null", () => {
    expect(
      bookCharacterInputSchema.parse(makeCharacter({ universeSlug: "the-witcher-1" }))
        .universeSlug,
    ).toBe("the-witcher-1");

    expect(
      bookCharacterInputSchema.parse(makeCharacter({ universeSlug: null }))
        .universeSlug,
    ).toBeNull();

    expect(
      bookCharacterInputSchema.parse(makeCharacter({ universeSlug: "" }))
        .universeSlug,
    ).toBeNull();

    expect(
      bookCharacterInputSchema.parse(makeCharacter({ universeSlug: "   " }))
        .universeSlug,
    ).toBeNull();

    expect(() =>
      bookCharacterInputSchema.parse(makeCharacter({ universeSlug: "-" })),
    ).toThrow();
    expect(() =>
      bookCharacterInputSchema.parse(makeCharacter({ universeSlug: "---" })),
    ).toThrow();
    expect(() =>
      bookCharacterInputSchema.parse(makeCharacter({ universeSlug: "ведьмак" })),
    ).toThrow();
  });

  it("нормализует null в aliases, traits и relations от ИИ к пустым массивам", () => {
    const parsed = bookCharacterInputSchema.parse(
      makeCharacter({
        aliases: null,
        traits: null,
        relations: null,
      }),
    );

    expect(parsed.aliases).toEqual([]);
    expect(parsed.traits).toEqual([]);
    expect(parsed.relations).toEqual([]);
  });

  it("отклоняет массив вместо объекта персонажа и неизвестную роль / короткое описание", () => {
    expect(() => bookCharacterInputSchema.parse(["Геральт"])).toThrow();
    expect(() =>
      bookCharactersListSchema.parse([
        { name: "А", role: "unknown_role", summary: "коротко" },
      ]),
    ).toThrow();
  });

  it("соблюдает лимиты массивов и числовых полей", () => {
    expect(() =>
      bookCharacterInputSchema.parse(
        makeCharacter({ aliases: Array.from({ length: 9 }, (_, i) => `Alias ${i}`) }),
      ),
    ).toThrow();

    expect(() =>
      bookCharacterInputSchema.parse(
        makeCharacter({ traits: Array.from({ length: 6 }, (_, i) => `trait-${i}`) }),
      ),
    ).toThrow();

    expect(() =>
      bookCharacterInputSchema.parse(
        makeCharacter({
          relations: Array.from({ length: 11 }, (_, i) => ({
            targetName: `Персонаж ${i}`,
            label: "знакомый",
          })),
        }),
      ),
    ).toThrow();

    expect(() =>
      bookCharactersListSchema.parse(
        Array.from({ length: 21 }, (_, i) => makeCharacter({ name: `Герой ${i}` })),
      ),
    ).toThrow();

    expect(() =>
      bookCharacterInputSchema.parse(makeCharacter({ characterId: 0 })),
    ).toThrow();
    expect(() =>
      bookCharacterInputSchema.parse(makeCharacter({ characterId: -5 })),
    ).toThrow();
    expect(() =>
      bookCharacterInputSchema.parse(makeCharacter({ sortOrder: -1 })),
    ).toThrow();
  });

  it("снимает markdown-обёртку ```json и вводную фразу при импорте ответа ИИ", () => {
    const raw = [
      "Вот извлечённые персонажи книги:",
      "",
      "```json",
      JSON.stringify([
        {
          name: "Данте Алигьери",
          aliases: ["Пилигрим"],
          role: "протагонист",
          traits: ["сомневающийся", "наблюдательный"],
          summary:
            "Поэт и изгнанник, заблудившийся в сумрачном лесу и начинающий путь по загробным мирам.",
          relations: [{ targetName: "Вергилий", label: "проводник" }],
        },
      ]),
      "```",
    ].join("\n");

    const result = sanitizeAndParseAiCharacters(raw);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Данте Алигьери");
    expect(result[0].relations).toEqual([{ targetName: "Вергилий", label: "проводник" }]);
  });

  it("отклоняет пустой массив [] и битый JSON в sanitizeAndParseAiCharacters", () => {
    expect(() => sanitizeAndParseAiCharacters("[]")).toThrow();
    expect(() => sanitizeAndParseAiCharacters("```json\n[]\n```")).toThrow();
    expect(() => sanitizeAndParseAiCharacters("{invalid json")).toThrow();
  });
});
