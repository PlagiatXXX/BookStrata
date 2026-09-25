import { describe, it, expect } from "vitest";
import { genreSimilarity } from "../genreSimilarity";

describe("genreSimilarity", () => {
  it("пустой выбор пользователя → undefined (ось неактивна)", () => {
    expect(genreSimilarity([], { genre: "Фэнтези", tags: [] })).toBeUndefined();
  });

  it("у книги неопознанный жанр → undefined", () => {
    expect(genreSimilarity(["fantasy"], { genre: "Авангардный журнал", tags: [] })).toBeUndefined();
  });

  it("точное попадание, confidence 1.0 → 100", () => {
    expect(
      genreSimilarity(["fantasy"], { genre: "Фэнтези", tags: [], genreConfidence: 1 }),
    ).toBe(100);
  });

  it("фолбэк confidence 0.5 (нет поля) → половина raw", () => {
    // base=1, bonus=0, raw=1, ×0.5 → 50
    expect(genreSimilarity(["fantasy"], { genre: "Фэнтези", tags: [] })).toBe(50);
  });

  it("мульти-жанр книги: доля категорий в выборке", () => {
    // книга = [thriller, classics], выбран только thriller → base = 0.5
    const sim = genreSimilarity(["thriller"], {
      genre: "Детектив, Классика",
      tags: [],
      genreConfidence: 1,
    });
    expect(sim).toBe(50);
  });

  it("теги добавляют бонус (cap 1.0)", () => {
    // книга horror (не в выборе): base=0; тег «мистика» → horror ∈ выбору → bonus
    const withTag = genreSimilarity(["horror"], {
      genre: "Мистика",
      tags: ["мистика"],
      genreConfidence: 1,
    });
    // base = 1 (уже попадание) → проверим на частичном кейсе:
    const partial = genreSimilarity(["fantasy"], {
      genre: "Фэнтези",
      tags: ["магия"], // fantasy — в выборе, base=1, bonus не важен
      genreConfidence: 1,
    });
    expect(withTag).toBe(100);
    expect(partial).toBe(100);

    // base=0, только тег вытягивает: категория жанра не в выборе, тег в выборе.
    // Без бонуса тегов → 0, с бонусом → 20 (0 + 0.2*1, cap 1.0, confidence 1).
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

  it("полный промах → 0", () => {
    expect(
      genreSimilarity(["sci-fi"], { genre: "Фэнтези", tags: [], genreConfidence: 1 }),
    ).toBe(0);
  });

  it("результирует в целые 0–100", () => {
    const sim = genreSimilarity(["fantasy"], {
      genre: "Фэнтези",
      tags: ["магия", "драконы"],
      genreConfidence: 0.83,
    });
    expect(Number.isInteger(sim)).toBe(true);
    expect(sim!).toBeGreaterThanOrEqual(0);
    expect(sim!).toBeLessThanOrEqual(100);
  });
});
