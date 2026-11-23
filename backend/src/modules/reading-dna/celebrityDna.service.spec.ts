import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    celebrity: {
      findMany: vi.fn(),
    },
    readingDna: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma.js";
import {
  buildCelebrityDnaProfile,
  getCelebritiesWithDna,
  conductCelebrityDuel,
  clearCelebrityDnaCache,
} from "./celebrityDna.service.js";

const makeBook = (
  id: number,
  title: string,
  author: string,
  axes: {
    storyFocus: number;
    emotionalWeight: number;
    pace: number;
    darkness: number;
    scope: number;
    complexity: number;
  } | null,
  genre = "Классика"
) => ({
  id,
  title,
  author,
  coverImageUrl: `/covers/${id}.jpg`,
  genre,
  readingProfile: axes
    ? {
        ...axes,
        confidence: {
          storyFocus: 1,
          emotionalWeight: 1,
          pace: 1,
          darkness: 1,
          scope: 1,
          complexity: 1,
        },
      }
    : null,
});

describe("celebrityDna.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCelebrityDnaCache();
  });

  it("вычисляет ДНК знаменитости из тир-листа: топ-3 — любимые книги, последняя — криптонит", () => {
    const profile = buildCelebrityDnaProfile({
      id: 1,
      slug: "stephen-king",
      name: "Стивен Кинг",
      photoUrl: "/img/king.webp",
      category: "writer",
      focalX: 50,
      focalY: 40,
      tierOrder: ["tier-s", "tier-a", "tier-d"],
      catalogBooks: [
        // Намеренно перемешан порядок входа — сортировка должна восстановить tierOrder + rank
        {
          tierId: "tier-d",
          rank: 1,
          book: makeBook(4, "Сумерки", "Стефани Майер", {
            storyFocus: 10,
            emotionalWeight: 10,
            pace: 10,
            darkness: 10,
            scope: 10,
            complexity: 10,
          }),
        },
        {
          tierId: "tier-s",
          rank: 0,
          book: makeBook(1, "Повелитель мух", "Уильям Голдинг", {
            storyFocus: 70,
            emotionalWeight: 80,
            pace: 50,
            darkness: 90,
            scope: 40,
            complexity: 70,
          }),
        },
        {
          tierId: "tier-s",
          rank: 1,
          book: makeBook(2, "Кровавый меридиан", "Кормак Маккарти", {
            storyFocus: 70,
            emotionalWeight: 90,
            pace: 60,
            darkness: 95,
            scope: 70,
            complexity: 85,
          }),
        },
        {
          tierId: "tier-a",
          rank: 0,
          book: makeBook(3, "1984", "Джордж Оруэлл", {
            storyFocus: 70,
            emotionalWeight: 70,
            pace: 50,
            darkness: 85,
            scope: 60,
            complexity: 75,
          }),
        },
      ],
    });

    expect(profile).not.toBeNull();
    expect(profile!.favoriteBooks.map((b) => b.title)).toEqual([
      "Повелитель мух",
      "Кровавый меридиан",
      "1984",
    ]);
    // Последняя книга тир-листа — криптонит!
    expect(profile!.kryptoniteBook?.title).toBe("Сумерки");
    // Криптонит (10 по всем осям) исключён из положительных осей, поэтому darkness остаётся высоким (~91)
    expect(profile!.axes.darkness).toBeGreaterThanOrEqual(85);
    expect(profile!.archetype).toBeTruthy();
  });

  it("возвращает null, если у знаменитости меньше 3 книг с readingProfile", () => {
    const profile = buildCelebrityDnaProfile({
      id: 2,
      slug: "incomplete-celeb",
      name: "Без профиля",
      photoUrl: "",
      category: "actor",
      focalX: 50,
      focalY: 50,
      tierOrder: ["tier-s"],
      catalogBooks: [
        { tierId: "tier-s", rank: 0, book: makeBook(1, "Книга 1", "А1", null) },
        { tierId: "tier-s", rank: 1, book: makeBook(2, "Книга 2", "А2", null) },
        { tierId: "tier-s", rank: 2, book: makeBook(3, "Книга 3", "А3", null) },
      ],
    });

    expect(profile).toBeNull();
  });

  it("проводит дуэль со знаменитостью и фиксирует криптонит-конфликт, если любимая книга игрока = последняя книга тир-листа знаменитости", async () => {
    (prisma.celebrity.findMany as any).mockResolvedValue([
      {
        id: 1,
        slug: "stephen-king",
        name: "Стивен Кинг",
        photoUrl: "/img/king.webp",
        category: "writer",
        focalX: 50,
        focalY: 50,
        tierOrder: ["tier-s", "tier-d"],
        catalogBooks: [
          {
            tierId: "tier-s",
            rank: 0,
            book: makeBook(1, "Повелитель мух", "Уильям Голдинг", {
              storyFocus: 70,
              emotionalWeight: 80,
              pace: 50,
              darkness: 90,
              scope: 40,
              complexity: 70,
            }),
          },
          {
            tierId: "tier-s",
            rank: 1,
            book: makeBook(2, "Кровавый меридиан", "Кормак Маккарти", {
              storyFocus: 70,
              emotionalWeight: 90,
              pace: 60,
              darkness: 95,
              scope: 70,
              complexity: 85,
            }),
          },
          {
            tierId: "tier-s",
            rank: 2,
            book: makeBook(3, "1984", "Джордж Оруэлл", {
              storyFocus: 70,
              emotionalWeight: 70,
              pace: 50,
              darkness: 85,
              scope: 60,
              complexity: 75,
            }),
          },
          {
            tierId: "tier-d",
            rank: 0,
            book: makeBook(4, "Сумерки", "Стефани Майер", {
              storyFocus: 20,
              emotionalWeight: 20,
              pace: 20,
              darkness: 20,
              scope: 20,
              complexity: 20,
            }),
          },
        ],
      },
    ]);

    const list = await getCelebritiesWithDna();
    expect(list).toHaveLength(1);

    (prisma.readingDna.findUnique as any).mockResolvedValue({
      ticketNumber: "BS-7492-A",
      storyFocus: 70,
      emotionalWeight: 80,
      pace: 55,
      darkness: 88,
      scope: 55,
      complexity: 75,
      favoriteBooks: [
        { title: "Сумерки", author: "Стефани Майер", bookId: 4 },
        { title: "1984", author: "Джордж Оруэлл", bookId: 3 },
        { title: "Дюна", author: "Фрэнк Герберт" },
      ],
      kryptoniteBook: null,
      likedGenres: ["Классика"],
      dislikedGenres: [],
      favoriteAuthors: [],
      theme: "dark",
    });

    const result = await conductCelebrityDuel({
      slug: "stephen-king",
      challengerTicketNumber: "BS-7492-A",
    });

    expect(result.celebrity.name).toBe("Стивен Кинг");
    expect(result.breakdown.kryptoniteConflict).toBe(true);
    expect(result.verdict).toMatch(/криптонит/i);
  });
});
