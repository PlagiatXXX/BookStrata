// backend/src/modules/authors/authorSeo.spec.ts
// Логика отбора авторов под SEO-страницы и промпт генерации описаний
import { describe, it, expect } from "vitest";
import {
  selectTargetAuthors,
  buildSeoPrompt,
  MIN_SHOWS_PER_MONTH,
  MIN_BOOKS,
} from "./authorSeo.js";

describe("selectTargetAuthors", () => {
  it("оставляет только показы >= порога и книги >= порога", () => {
    const rows = [
      { slug: "tolstoy", name: "Лев Толстой", showsPerMonth: 50000, bookCount: 30 },
      { slug: "malo", name: "Мало спроса", showsPerMonth: 999, bookCount: 30 },
      { slug: "malo-knig", name: "Мало книг", showsPerMonth: 50000, bookCount: 2 },
      { slug: "ok", name: "Ок", showsPerMonth: 1000, bookCount: 3 },
    ];
    expect(selectTargetAuthors(rows).map((r) => r.slug)).toEqual(["tolstoy", "ok"]);
  });

  it("пороги: 1000 показов/мес и 3 книги", () => {
    expect(MIN_SHOWS_PER_MONTH).toBe(1000);
    expect(MIN_BOOKS).toBe(3);
  });

  it("пустой список — пустой результат", () => {
    expect(selectTargetAuthors([])).toEqual([]);
  });

  it("не мутирует входной массив", () => {
    const rows = [{ slug: "a", name: "A", showsPerMonth: 5000, bookCount: 5 }];
    const copy = [...rows];
    selectTargetAuthors(rows);
    expect(rows).toEqual(copy);
  });
});

describe("buildSeoPrompt", () => {
  const input = {
    name: "Лев Толстой",
    bookTitles: ["Война и мир", "Анна Каренина", "Воскресение"],
    bookCount: 30,
    genre: "Классическая проза",
  };

  it("содержит имя автора и перечень книг", () => {
    const prompt = buildSeoPrompt(input);
    expect(prompt).toContain("Лев Толстой");
    expect(prompt).toContain("Война и мир");
    expect(prompt).toContain("Анна Каренина");
    expect(prompt).toContain("Классическая проза");
    expect(prompt).toContain("30");
  });

  it("содержит требования: лимит слов, запрет выдумок, SEO-хвосты", () => {
    const prompt = buildSeoPrompt(input);
    expect(prompt).toMatch(/не более 600|150–600|150-600/);
    expect(prompt).toMatch(/не выдумывай/i);
    expect(prompt).toContain("библиография");
    expect(prompt).toContain("JSON");
  });

  it("обрезает список книг до 10", () => {
    const manyBooks = Array.from({ length: 25 }, (_, i) => `Книга ${i + 1}`);
    const prompt = buildSeoPrompt({ ...input, bookTitles: manyBooks });
    expect(prompt).toContain("Книга 10");
    expect(prompt).not.toContain("Книга 11");
  });

  it("без жанра — не падает и не добавляет строку жанра", () => {
    const prompt = buildSeoPrompt({ ...input, genre: null });
    expect(prompt).toContain("Лев Толстой");
    expect(prompt).not.toContain("жанр:");
  });
});
