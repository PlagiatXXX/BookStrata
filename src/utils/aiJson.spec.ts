import { describe, it, expect } from "vitest";
import { parseAiJson } from "./aiJson";

describe("parseAiJson", () => {
  it("парсит обычный валидный JSON без искажения экранированных кавычек и переносов", () => {
    const raw = JSON.stringify({
      short_hook: 'Книга с "кавычками"\nи второй строкой',
      vibe: "напряжённый",
    });

    expect(parseAiJson(raw)).toEqual({
      short_hook: 'Книга с "кавычками"\nи второй строкой',
      vibe: "напряжённый",
    });
  });

  it("снимает markdown-обёртку ```json и вводный текст", () => {
    const raw = [
      "Вот готовый JSON для паспорта:",
      "```json",
      '{"short_hook":"Хук книги","vibe":"мрачный"}',
      "```",
    ].join("\n");

    expect(parseAiJson(raw)).toEqual({
      short_hook: "Хук книги",
      vibe: "мрачный",
    });
  });

  it("очищает Markdown hard-line-break (\\\\ в конце строк) и HTML-сущности &#x20; из реального вывода ИИ", () => {
    const raw = [
      "[\\",
      "&#x20; {\\",
      '&#x20;   "name": "Чэнь",\\',
      '&#x20;   "aliases": [\\',
      '&#x20;     "Доктор Чэнь"\\',
      "&#x20;   ],\\",
      '&#x20;   "universeSlug": null,\\',
      '&#x20;   "role": "protagonist",\\',
      '&#x20;   "traits": [\\',
      '&#x20;     "Любознательный"\\',
      "&#x20;   ],\\",
      '&#x20;   "summary": "Главный герой и рассказчик романа, физик, посвятивший жизнь изучению шаровой молнии.",\\',
      '&#x20;   "relations": [\\',
      "&#x20;     {\\",
      '&#x20;       "targetName": "Чжан Бинь",\\',
      '&#x20;       "label": "Научный наставник"\\',
      "&#x20;     }\\",
      "&#x20;   ]\\",
      "&#x20; }\\",
      "]",
    ].join("\n");

    const parsed = parseAiJson(raw) as Array<{ name: string; aliases: string[] }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Чэнь");
    expect(parsed[0].aliases).toEqual(["Доктор Чэнь"]);
  });

  it("очищает markdown-экранирование скобок и подчёркиваний в объекте паспорта книги", () => {
    const raw = [
      "Ответ:",
      "\\{\\",
      '&#x20; "short\\_hook": "Короткий хук книги",\\',
      '&#x20; "key\\_takeaways": \\["Тезис 1", "Тезис 2"\\]\\',
      "\\}",
    ].join("\n");

    expect(parseAiJson(raw)).toEqual({
      short_hook: "Короткий хук книги",
      key_takeaways: ["Тезис 1", "Тезис 2"],
    });
  });
});
