import { describe, it, expect } from "vitest";
import {
  GENRE_CATEGORIES,
  GENRE_GROUPS,
  parseBookGenre,
  tagToCategoryId,
  isCategoryId,
} from "./genre-taxonomy";

describe("genre-taxonomy", () => {
  it("19 категорий, каждая в группе из GENRE_GROUPS", () => {
    expect(GENRE_CATEGORIES).toHaveLength(19);
    const groupIds = new Set(GENRE_GROUPS.map((g) => g.id));
    for (const c of GENRE_CATEGORIES) expect(groupIds.has(c.group)).toBe(true);
  });

  it("parseBookGenre: точное попадание", () => {
    expect(parseBookGenre("Фэнтези")).toEqual(["fantasy"]);
  });

  it("parseBookGenre: мульти-жанр через запятую", () => {
    expect(parseBookGenre("Мистика, Ужасы").sort()).toEqual(["horror"]);
    expect(parseBookGenre("Детектив, Классика").sort()).toEqual(["classics", "thriller"]);
  });

  it("parseBookGenre: регистр и опечатки хвоста не мешают", () => {
    expect(parseBookGenre("  фэнтези ")).toEqual(["fantasy"]);
    expect(parseBookGenre("Научная фантастика,")).toEqual(["sci-fi"]);
    expect(parseBookGenre("Young Adul")).toEqual(["young-adult"]);
    expect(parseBookGenre("Ромэнтези")).toEqual(["fantasy"]);
    expect(parseBookGenre("Нон-фикшен")).toEqual(["non-fiction"]);
  });

  it("parseBookGenre: неопознанное/пустое → []", () => {
    expect(parseBookGenre("Авангардный журнал")).toEqual([]);
    expect(parseBookGenre(null)).toEqual([]);
    expect(parseBookGenre("")).toEqual([]);
    expect(parseBookGenre("   ,  , ")).toEqual([]);
  });

  it("parseBookGenre: дубли схлопываются", () => {
    expect(parseBookGenre("Ужасы, Мистика")).toEqual(["horror"]);
  });

  it("tagToCategoryId: жанровые теги мапятся, мусорные — null", () => {
    expect(tagToCategoryId("фэнтези")).toBe("fantasy");
    expect(tagToCategoryId("магия")).toBe("fantasy");
    expect(tagToCategoryId("Троянская война")).toBe("historical");
    expect(tagToCategoryId("абракадабра-фиктик")).toBeNull();
  });

  it("isCategoryId: валидирует id", () => {
    expect(isCategoryId("fantasy")).toBe(true);
    expect(isCategoryId("nonsense")).toBe(false);
  });
});
