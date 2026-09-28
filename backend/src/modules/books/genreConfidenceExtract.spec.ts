import { describe, it, expect } from "vitest";
import { extractGenreConfidence } from "./genreConfidenceExtract.js";

describe("extractGenreConfidence", () => {
  it("чистое число", () => {
    expect(extractGenreConfidence("0.85")).toBe(0.85);
    expect(extractGenreConfidence("1")).toBe(1);
  });

  it("число в JSON", () => {
    expect(extractGenreConfidence('{"genreConfidence": 0.7}')).toBe(0.7);
    expect(extractGenreConfidence('Ответ: {"genreConfidence":0.42} хвост')).toBe(0.42);
  });

  it("мусор → null", () => {
    expect(extractGenreConfidence("не знаю")).toBeNull();
    expect(extractGenreConfidence("")).toBeNull();
  });

  it("вне 0–1 → null", () => {
    expect(extractGenreConfidence("1.5")).toBeNull();
    expect(extractGenreConfidence("-0.2")).toBeNull();
    expect(extractGenreConfidence('{"genreConfidence": 1.5}')).toBeNull();
    expect(extractGenreConfidence('{"genreConfidence": 10}')).toBeNull();
  });
});
