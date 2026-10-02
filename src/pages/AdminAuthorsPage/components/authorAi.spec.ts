// Тесты генератора промпта и парсера ответа ИИ для админки авторов.
import { describe, it, expect } from "vitest";
import { buildAuthorAiPrompt, parseAuthorAiResponse } from "./authorAi";

describe("buildAuthorAiPrompt", () => {
  it("подставляет имя автора", () => {
    const prompt = buildAuthorAiPrompt("Лев Толстой");
    expect(prompt).toContain("Лев Толстой");
  });

  it("содержит формат JSON и все поля ответа", () => {
    const prompt = buildAuthorAiPrompt("X");
    for (const key of [
      "badge",
      "motto",
      "manifestoQuote",
      "manifestoAuthor",
      "manifestoRole",
      "aboutText",
      "stats",
      "source",
    ]) {
      expect(prompt).toContain(`"${key}"`);
    }
    expect(prompt).toContain("JSON");
  });

  it("содержит запреты на галлюцинации и требование источника для статистики", () => {
    const prompt = buildAuthorAiPrompt("X");
    expect(prompt).toMatch(/галлюцина/i);
    expect(prompt).toMatch(/источник/i);
    expect(prompt).toMatch(/markdown/i);
  });

  it("даёт ИИ примеры приоритетных статистик (книги, экранизации, рекорды)", () => {
    const prompt = buildAuthorAiPrompt("X");
    expect(prompt).toMatch(/написанных книг/i);
    expect(prompt).toMatch(/экранизац/i);
    expect(prompt).toMatch(/New York Times/i);
  });

  it("требует русский язык для всех строковых значений JSON, включая цитаты", () => {
    const prompt = buildAuthorAiPrompt("X");
    expect(prompt).toContain("ВСЕ строковые значения JSON — на русском");
  });

  it("иноязычная цитата — русский перевод с оригиналом, иначе пустая строка", () => {
    const prompt = buildAuthorAiPrompt("X");
    expect(prompt).toContain("«перевод (ориг.: оригинал)»");
    expect(prompt).toContain('"manifestoQuote" = ""');
  });
});

describe("parseAuthorAiResponse", () => {
  const valid = {
    badge: "Классик",
    motto: "Литература как архитектура памяти",
    manifestoQuote: "Каждое предложение — возведение пространства.",
    manifestoAuthor: "Критик Иванов",
    manifestoRole: "Обозреватель",
    aboutText: "Текст о траектории.",
    stats: [
      { value: "14 млн", label: "напечатанных книг", source: "Википедия" },
      { value: "1234", label: "произведений", source: "Британника" },
    ],
  };

  it("парсит валидный JSON в патч формы", () => {
    const fill = parseAuthorAiResponse(JSON.stringify(valid));
    expect(fill).toEqual({
      badge: "Классик",
      motto: "Литература как архитектура памяти",
      manifestoQuote: "Каждое предложение — возведение пространства.",
      manifestoAuthor: "Критик Иванов",
      manifestoRole: "Обозреватель",
      aboutText: "Текст о траектории.",
      stats: [
        { value: "14 млн", label: "напечатанных книг" },
        { value: "1234", label: "произведений" },
      ],
      statSources: ["Википедия", "Британника"],
    });
  });

  it("срезает markdown-обёртку ```json", () => {
    const raw = "```json\n" + JSON.stringify(valid) + "\n```";
    expect(parseAuthorAiResponse(raw).badge).toBe("Классик");
  });

  it("бросает понятную ошибку на битом JSON", () => {
    expect(() => parseAuthorAiResponse("не json")).toThrow(/JSON/i);
  });

  it("бросает ошибку, если ответ не объект", () => {
    expect(() => parseAuthorAiResponse("[1,2]")).toThrow();
    expect(() => parseAuthorAiResponse('"строка"')).toThrow();
  });

  it("null и отсутствующие поля → пустая строка", () => {
    const fill = parseAuthorAiResponse(
      JSON.stringify({ badge: null, motto: undefined, stats: [] }),
    );
    expect(fill.badge).toBe("");
    expect(fill.motto).toBe("");
    expect(fill.manifestoAuthor).toBe("");
    expect(fill.aboutText).toBe("");
  });

  it("необъектные stats → пустой массив, лишние ключи игнорируются", () => {
    const fill = parseAuthorAiResponse(
      JSON.stringify({ stats: "нет", extra: 1, badge: "B" }),
    );
    expect(fill.stats).toEqual([]);
    expect(fill.statSources).toEqual([]);
    expect(fill.badge).toBe("B");
    expect(fill).not.toHaveProperty("extra");
  });

  it("stats: отбрасывает строки без value/label, срезает до 8, source уходит в statSources", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      value: `V${i}`,
      label: `L${i}`,
      source: `S${i}`,
    }));
    const fill = parseAuthorAiResponse(
      JSON.stringify({
        stats: [...many, { value: "", label: "без значения" }, { label: "нет value" }],
      }),
    );
    expect(fill.stats).toHaveLength(8);
    expect(fill.stats[0]).toEqual({ value: "V0", label: "L0" });
    expect(fill.statSources).toEqual(Array.from({ length: 8 }, (_, i) => `S${i}`));
  });

  it("статистика без source → источник пустая строка в том же порядке", () => {
    const fill = parseAuthorAiResponse(
      JSON.stringify({ stats: [{ value: "10", label: "штук" }] }),
    );
    expect(fill.statSources).toEqual([""]);
  });

  it("обрезает поля до лимитов бэкенд-валидации", () => {
    const fill = parseAuthorAiResponse(
      JSON.stringify({ badge: "Б".repeat(300), motto: "М".repeat(600) }),
    );
    expect(fill.badge.length).toBeLessThanOrEqual(200);
    expect(fill.motto.length).toBeLessThanOrEqual(500);
  });
});
