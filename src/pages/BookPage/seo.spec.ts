// src/pages/BookPage/seo.spec.ts
import { describe, it, expect } from "vitest";
import { buildBookJsonLd } from "./seo";

const baseBook = {
  title: "Божественная комедия",
  author: "Данте Алигьери",
  coverImageUrl: "https://example.com/dante.jpg",
  description: "Поэма о путешествии через Ад, Чистилище и Рай.",
  genre: "Поэзия",
  publishedYear: 1321,
  isbn: null,
  url: "https://bookstrata.ru/books/bozhestvennaya-komediya",
};

describe("buildBookJsonLd — character", () => {
  it("добавляет character: [{ '@type': 'Person', name }] при наличии персонажей", () => {
    const ld = buildBookJsonLd({
      ...baseBook,
      characters: [{ name: "Данте" }, { name: "Вергилий" }],
    });

    expect(ld.character).toEqual([
      { "@type": "Person", name: "Данте" },
      { "@type": "Person", name: "Вергилий" },
    ]);
  });

  it("фильтрует персонажей с пустыми или пробельно-пустыми именами и обрезает пробелы", () => {
    const ld = buildBookJsonLd({
      ...baseBook,
      characters: [{ name: "  Данте  " }, { name: "   " }, { name: "" }],
    });

    expect(ld.character).toEqual([{ "@type": "Person", name: "Данте" }]);
  });

  it("дедуплицирует повторяющиеся имена персонажей (с учётом trim)", () => {
    const ld = buildBookJsonLd({
      ...baseBook,
      characters: [
        { name: "Данте" },
        { name: "  Данте  " },
        { name: "Вергилий" },
        { name: "Данте" },
      ],
    });

    expect(ld.character).toEqual([
      { "@type": "Person", name: "Данте" },
      { "@type": "Person", name: "Вергилий" },
    ]);
  });

  it("не добавляет поле character, если массив пустой или не передан", () => {
    const withoutField = buildBookJsonLd(baseBook);
    expect("character" in withoutField).toBe(false);

    const withEmpty = buildBookJsonLd({ ...baseBook, characters: [] });
    expect("character" in withEmpty).toBe(false);

    const withNull = buildBookJsonLd({ ...baseBook, characters: null });
    expect("character" in withNull).toBe(false);

    const withBlankOnly = buildBookJsonLd({
      ...baseBook,
      characters: [{ name: "   " }],
    });
    expect("character" in withBlankOnly).toBe(false);
  });
});
