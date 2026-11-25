import { describe, it, expect } from "vitest";
import {
  readingDnaInputSchema,
  readingDnaDuelInputSchema,
  readingDnaResponseSchema,
} from "./readingDna.schema.js";

describe("readingDna.schema", () => {
  const validAxes = {
    storyFocus: 45,
    emotionalWeight: 80,
    pace: 30,
    darkness: 75,
    scope: 60,
    complexity: 85,
  };

  const validBooks = [
    { title: "Мастер и Маргарита", author: "М. Булгаков", bookId: 10 },
    { title: "1984", author: "Дж. Оруэлл", bookId: 25 },
    { title: "Дюна", author: "Ф. Герберт" },
  ];

  const validKryptonite = {
    title: "Сумерки",
    author: "С. Майер",
  };

  it("успешно валидирует корректный входной профиль ReadingDna", () => {
    const input = {
      axes: validAxes,
      favoriteBooks: validBooks,
      kryptoniteBook: validKryptonite,
      likedGenres: ["Фантастика", "Классика"],
      dislikedGenres: ["Любовный роман"],
      favoriteAuthors: ["Булгаков", "Оруэлл"],
      customName: "Фёдор",
      theme: "dark",
      guestToken: "guest-uuid-1234",
    };

    const parsed = readingDnaInputSchema.parse(input);
    expect(parsed.axes.storyFocus).toBe(45);
    expect(parsed.favoriteBooks.length).toBe(3);
    expect(parsed.theme).toBe("dark");
  });

  it("выбрасывает ошибку при невалидных осях (меньше 0 или больше 100)", () => {
    const invalidAxes = {
      ...validAxes,
      storyFocus: 120, // > 100
    };

    expect(() =>
      readingDnaInputSchema.parse({
        axes: invalidAxes,
        favoriteBooks: validBooks,
      })
    ).toThrow();
  });

  it("требует ровно 3 любимые книги", () => {
    expect(() =>
      readingDnaInputSchema.parse({
        axes: validAxes,
        favoriteBooks: [validBooks[0], validBooks[1]], // только 2 книги
      })
    ).toThrow();

    expect(() =>
      readingDnaInputSchema.parse({
        axes: validAxes,
        favoriteBooks: [...validBooks, { title: "4-я книга" }], // 4 книги
      })
    ).toThrow();
  });

  it("валидирует схему входных данных для дуэли", () => {
    const duelInput = {
      targetTicketNumber: "BS-7492-X",
      challengerName: "Алиса",
      challengerDna: {
        axes: validAxes,
        favoriteBooks: validBooks,
        kryptoniteBook: validKryptonite,
        likedGenres: ["Детектив"],
      },
    };

    const parsed = readingDnaDuelInputSchema.parse(duelInput);
    expect(parsed.targetTicketNumber).toBe("BS-7492-X");
    expect(parsed.challengerName).toBe("Алиса");
  });

  it("запрещает дубликаты книг в favoriteBooks и совпадение криптонита с любимой книгой", () => {
    expect(() =>
      readingDnaInputSchema.parse({
        axes: validAxes,
        favoriteBooks: [
          { title: "1984", bookId: 25 },
          { title: "1984", bookId: 25 },
          { title: "Дюна" },
        ],
      })
    ).toThrow(/одну и ту же книгу/i);

    expect(() =>
      readingDnaInputSchema.parse({
        axes: validAxes,
        favoriteBooks: validBooks,
        kryptoniteBook: { title: " дюна " },
      })
    ).toThrow(/одновременно быть криптонитом/i);

    expect(() =>
      readingDnaInputSchema.parse({
        axes: validAxes,
        favoriteBooks: [
          { title: "1984", coverImageUrl: "javascript:alert(1)" },
          { title: "Дюна" },
          { title: "Улисс" },
        ],
      })
    ).toThrow(/Некорректный URL обложки/i);
  });

  it("валидирует выходную схему ответа билета ReadingDna", () => {
    const responseData = {
      id: 1,
      ticketNumber: "BS-7492-X",
      customName: "Фёдор",
      archetype: "dark-archivist",
      archetypeName: "Хранитель запретных фолиантов",
      archetypeDesc: "Ищет катарсис через исследование бездны человеческой природы.",
      motto: "В тенях всегда скрыто больше правды, чем при ярком дневном свете.",
      theme: "dark",
      axes: validAxes,
      favoriteBooks: validBooks,
      kryptoniteBook: validKryptonite,
      likedGenres: ["Фантастика"],
      dislikedGenres: ["Любовный роман"],
      favoriteAuthors: ["Оруэлл"],
      shareUrl: "https://bookstrata.ru/reading-dna?ticket=BS-7492-X",
      shortCode: "7492X",
      viewsCount: 15,
      shareCount: 3,
      duelsCount: 2,
      createdAt: new Date().toISOString(),
    };

    const parsed = readingDnaResponseSchema.parse(responseData);
    expect(parsed.ticketNumber).toBe("BS-7492-X");
    expect(parsed.archetype).toBe("dark-archivist");
  });
});
