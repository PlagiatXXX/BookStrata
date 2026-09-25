// backend/src/modules/books/genreSimilarity.service.spec.ts
import { describe, it, expect } from "vitest";
import { genreSimilarity } from "./genreSimilarity.service.js";

describe("genreSimilarity (бэк-порт)", () => {
  it("пустой выбор → undefined", () => {
    expect(genreSimilarity([], { genre: "Фэнтези", tags: [] })).toBeUndefined();
  });

  it("неопознанный жанр книги → undefined", () => {
    expect(genreSimilarity(["fantasy"], { genre: "Авангардный журнал", tags: [] })).toBeUndefined();
  });

  it("точное попадание при confidence=1 → 100", () => {
    expect(
      genreSimilarity(["fantasy"], { genre: "Фэнтези", tags: [], genreConfidence: 1 }),
    ).toBe(100);
  });

  it("фолбэк confidence 0.5 → 50", () => {
    expect(genreSimilarity(["fantasy"], { genre: "Фэнтези", tags: [] })).toBe(50);
  });

  it("частичное попадание мульти-жанра", () => {
    expect(
      genreSimilarity(["thriller"], {
        genre: "Детектив, Классика",
        tags: [],
        genreConfidence: 1,
      }),
    ).toBe(50);
  });

  it("теги добавляют бонус поверх base", () => {
    // base=0, только тег вытягивает: категория жанра не в выборе, тег в выборе.
    // Без бонуса тегов → 0, с бонусом → 20 (0 + 0.2*1, confidence 1).
    expect(
      genreSimilarity(["fantasy"], {
        genre: "Детектив",
        tags: ["магия"],
        genreConfidence: 1,
      }),
    ).toBe(20);

    // частичный base + тег: мульти-жанр, половина в выборе → 50, тег добавляет 0.2 → 70.
    expect(
      genreSimilarity(["fantasy"], {
        genre: "Фэнтези, Детектив",
        tags: ["магия"],
        genreConfidence: 1,
      }),
    ).toBe(70);
  });

  it("промах → 0", () => {
    expect(
      genreSimilarity(["sci-fi"], { genre: "Фэнтези", tags: [], genreConfidence: 1 }),
    ).toBe(0);
  });
});
