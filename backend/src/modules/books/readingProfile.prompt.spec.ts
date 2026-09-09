// backend/src/modules/books/readingProfile.prompt.spec.ts
import { describe, it, expect } from "vitest";
import { buildReadingProfilePrompt } from "./readingProfile.prompt.js";

const BOOK = {
  title: "Баллада о падающих драконах",
  author: "Сара А. Паркер",
  description: "Жажда мести в сердце Рэв не угасает.",
  genre: "Романтическое фэнтези",
  tags: ["драконы", "феи", "романтика"],
};

describe("buildReadingProfilePrompt", () => {
  const prompt = buildReadingProfilePrompt(BOOK);

  it("содержит метаданные книги", () => {
    expect(prompt).toContain("«Баллада о падающих драконах»");
    expect(prompt).toContain("Сара А. Паркер");
    expect(prompt).toContain("Романтическое фэнтези");
    expect(prompt).toContain("драконы, феи, романтика");
  });

  it("содержит инструкцию по Chain-of-Thought (анализ внутри JSON)", () => {
    expect(prompt).toContain("analysis");
    expect(prompt).toContain("краткий анализ книги");
  });

  it("разрешает использовать знания общеизвестных произведениях", () => {
    expect(prompt).toContain("knowledgeSource");
    expect(prompt).toContain("world_knowledge");
    expect(prompt).toContain("annotation_only");
  });

  it("запрещает markdown-обёртку и требует один JSON-объект", () => {
    expect(prompt).toContain("РОВНО ОДИН JSON-ОБЪЕКТ");
    expect(prompt).toContain("```");
  });

  it("требует целые числа без кавычек", () => {
    expect(prompt).toContain("целое");
    expect(prompt).toContain("без кавычек");
  });

  it("объясняет смысл задачи (система подбора книг)", () => {
    expect(prompt).toContain("подбора книг");
  });

  it("не содержит мусора копипаста (иероглифы, слипшиеся слова)", () => {
    expect(prompt).not.toMatch(/[\u4e00-\u9fff]/); // CJK-иероглифы
    expect(prompt).not.toContain("сямReading");
    expect(prompt).toContain("6 осям Reading DNA");
  });

  it("описывает все 6 осей и confidence", () => {
    expect(prompt).toContain("storyFocus");
    expect(prompt).toContain("emotionalWeight");
    expect(prompt).toContain("pace");
    expect(prompt).toContain("darkness");
    expect(prompt).toContain("scope");
    expect(prompt).toContain("complexity");
    expect(prompt).toContain("confidence");
    expect(prompt).toContain('"source": "ai"');
  });

  it("автор отсутствует — строка автора не ломает шаблон", () => {
    const noAuthor = buildReadingProfilePrompt({ ...BOOK, author: null });
    expect(noAuthor).toContain("«Баллада о падающих драконах»");
    expect(noAuthor).not.toContain("— null");
  });
});
