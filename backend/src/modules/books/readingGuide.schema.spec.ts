// backend/src/modules/books/readingGuide.schema.spec.ts
import { describe, it, expect } from "vitest";
import {
  readingGuideSchema,
  sanitizeAndParseReadingGuide,
  READING_PACE_VALUES,
  DIFFICULTY_VALUES,
} from "./readingGuide.schema.js";

const validGuide = {
  short_hook: "Роман о дьяволе, устроившем бал в атеистической Москве.",
  target_audience:
    "Любителям ироничной классики, ценителям метафизики и дворцовых интриг.",
  not_recommended_for:
    "Тем, кто ждёт лёгкого развлекательного чтива без философских слоёв.",
  reading_pace: "Динамичный",
  difficulty: "Средняя сложность",
  vibe: "Ирония и мистика",
  key_takeaways: [
    "Тема ответственности за выбор",
    "Метафора творчества и прощения",
    "Вечность как награда и наказание",
  ],
};

describe("readingGuideSchema", () => {
  it("пропускает валидный объект", () => {
    expect(() => readingGuideSchema.parse(validGuide)).not.toThrow();
  });

  it("пропускает key_takeaways из одного элемента", () => {
    expect(() =>
      readingGuideSchema.parse({ ...validGuide, key_takeaways: ["Один тезис"] }),
    ).not.toThrow();
  });

  it("отклоняет takeaways длиннее трёх", () => {
    expect(() =>
      readingGuideSchema.parse({
        ...validGuide,
        key_takeaways: ["1", "2", "3", "4"],
      }),
    ).toThrow();
  });

  it("отклоняет нестандартный reading_pace", () => {
    expect(() =>
      readingGuideSchema.parse({ ...validGuide, reading_pace: "Легко читается" }),
    ).toThrow(/reading_pace/);
  });

  it("отклоняет нестандартный difficulty", () => {
    expect(() =>
      readingGuideSchema.parse({ ...validGuide, difficulty: "На один вечер" }),
    ).toThrow(/difficulty/);
  });

  it("отклоняет отсутствие обязательного поля vibe", () => {
    const withoutVibe = { ...validGuide } as Record<string, unknown>;
    delete withoutVibe.vibe;
    expect(() => readingGuideSchema.parse(withoutVibe)).toThrow();
  });

  it("отклоняет пустые строки в takeaways", () => {
    expect(() =>
      readingGuideSchema.parse({ ...validGuide, key_takeaways: ["", "тезис"] }),
    ).toThrow();
  });

  it("экспортирует константы enum'ов для промпта оператора", () => {
    expect(READING_PACE_VALUES).toContain("Динамичный");
    expect(DIFFICULTY_VALUES).toContain("Легкое чтение");
  });
});

describe("sanitizeAndParseReadingGuide", () => {
  it("парсит чистый JSON", () => {
    const result = sanitizeAndParseReadingGuide(JSON.stringify(validGuide));
    expect(result.short_hook).toBe(validGuide.short_hook);
  });

  it("срезает markdown-обёртку ```json ... ```", () => {
    const wrapped = "```json\n" + JSON.stringify(validGuide) + "\n```";
    expect(() => sanitizeAndParseReadingGuide(wrapped)).not.toThrow();
  });

  it("срезает markdown-обёртку без языка ``` ... ```", () => {
    const wrapped = "```\n" + JSON.stringify(validGuide) + "\n```";
    expect(() => sanitizeAndParseReadingGuide(wrapped)).not.toThrow();
  });

  it("бросает SyntaxError на битый JSON (ИИ оборвал ответ)", () => {
    expect(() => sanitizeAndParseReadingGuide('{"short_hook": "не закрыл')).toThrow(
      SyntaxError,
    );
  });

  it("бросает ZodError на структурно невалидный JSON", () => {
    const partial = JSON.stringify({ short_hook: "Есть только хук" });
    expect(() => sanitizeAndParseReadingGuide(partial)).toThrow();
  });
});
