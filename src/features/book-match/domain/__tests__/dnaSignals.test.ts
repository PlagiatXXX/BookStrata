import { describe, it, expect } from "vitest";
import { detectDnaSignals, type BookMetaForSignals } from "../dnaSignals";
import type { ReadingDnaResponseData } from "@/lib/readingDnaApi";

const MOCK_DNA: ReadingDnaResponseData = {
  id: 1,
  ticketNumber: "BS-1234-A",
  archetype: "archivist",
  archetypeName: "Архивариус Бездны",
  theme: "dark",
  axes: {
    storyFocus: 20,
    emotionalWeight: 80,
    pace: 30,
    darkness: 90,
    scope: 70,
    complexity: 85,
  },
  favoriteBooks: [
    { title: "Имя розы", author: "Умберто Эко" },
    { title: "Мастер и Маргарита", author: "Михаил Булгаков" },
    { title: "1984", author: "Джордж Оруэлл" },
  ],
  kryptoniteBook: { title: "Сумерки", author: "Стефани Майер" },
  likedGenres: ["Детектив", "Классика"],
  dislikedGenres: ["Любовный роман", "Боевик"],
  favoriteAuthors: ["Умберто Эко", "Франц Кафка"],
  viewsCount: 0,
  shareCount: 0,
  duelsCount: 0,
  createdAt: "2026-11-16T00:00:00Z",
};

describe("detectDnaSignals", () => {
  it("возвращает пустые сигналы, если ДНК отсутствует", () => {
    const book: BookMetaForSignals = { title: "Любая книга", author: "Любой автор" };
    const signals = detectDnaSignals(book, null);
    expect(signals.isFavoriteAuthor).toBe(false);
    expect(signals.isDislikedGenre).toBe(false);
    expect(signals.isHolyGrailBook).toBe(false);
    expect(signals.kryptoniteRisk).toBe(false);
  });

  it("распознает любимого автора без учета регистра и пробелов", () => {
    const book: BookMetaForSignals = { title: "Замок", author: "  франц кафка  " };
    const signals = detectDnaSignals(book, MOCK_DNA);
    expect(signals.isFavoriteAuthor).toBe(true);
  });

  it("распознает нежелательный жанр из поля genre и tags", () => {
    const bookWithGenre: BookMetaForSignals = {
      title: "Романтика",
      genre: "любовный роман",
    };
    expect(detectDnaSignals(bookWithGenre, MOCK_DNA).isDislikedGenre).toBe(true);
    expect(detectDnaSignals(bookWithGenre, MOCK_DNA).dislikedGenreName).toBe("Любовный роман");

    const bookWithTag: BookMetaForSignals = {
      title: "Перестрелка",
      tags: ["боевик", "триллер"],
    };
    expect(detectDnaSignals(bookWithTag, MOCK_DNA).isDislikedGenre).toBe(true);
  });

  it("распознает любимую книгу (святыню) по названию и по bookId", () => {
    const bookByName: BookMetaForSignals = { title: "имя розы", author: "Эко" };
    const signals = detectDnaSignals(bookByName, MOCK_DNA);
    expect(signals.isHolyGrailBook).toBe(true);
    expect(signals.holyGrailTitle).toBe("Имя розы");

    const dnaWithId = {
      ...MOCK_DNA,
      favoriteBooks: [{ title: "Другая", bookId: 42 }],
    };
    const bookById: BookMetaForSignals = { title: "Любое название", id: 42 };
    expect(detectDnaSignals(bookById, dnaWithId as any).isHolyGrailBook).toBe(true);
  });

  it("распознает любимый жанр", () => {
    const book: BookMetaForSignals = { title: "Убийство в восточном экспрессе", genre: "детектив" };
    expect(detectDnaSignals(book, MOCK_DNA).isLikedGenre).toBe(true);
  });

  it("распознает риск криптонита при совпадении с книгой-антиподом", () => {
    const book: BookMetaForSignals = { title: "сумерки", author: "Стефани Майер" };
    const signals = detectDnaSignals(book, MOCK_DNA);
    expect(signals.kryptoniteRisk).toBe(true);
  });
});
