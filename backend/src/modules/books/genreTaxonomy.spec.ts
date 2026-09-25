// backend/src/modules/books/genreTaxonomy.spec.ts
import { describe, it, expect } from "vitest";
import { parseBookGenre, tagToCategoryId, isCategoryId, GENRE_CATEGORIES } from "./genreTaxonomy.js";

describe("genreTaxonomy (бэк-порт)", () => {
  it("19 категорий", () => {
    expect(GENRE_CATEGORIES).toHaveLength(19);
  });

  it("мульти-жанр и опечатки", () => {
    expect(parseBookGenre("Детектив, Классика").sort()).toEqual(["classics", "thriller"]);
    expect(parseBookGenre("Young Adul")).toEqual(["young-adult"]);
    expect(parseBookGenre("Ромэнтези")).toEqual(["fantasy"]);
  });

  it("неопознанное → []", () => {
    expect(parseBookGenre("Авангардный журнал")).toEqual([]);
    expect(parseBookGenre(null)).toEqual([]);
  });

  it("теги и isCategoryId", () => {
    expect(tagToCategoryId("магия")).toBe("fantasy");
    expect(tagToCategoryId("Троянская война")).toBe("historical");
    expect(tagToCategoryId("мусор")).toBeNull();
    expect(isCategoryId("horror")).toBe(true);
    expect(isCategoryId("нет")).toBe(false);
  });
});
