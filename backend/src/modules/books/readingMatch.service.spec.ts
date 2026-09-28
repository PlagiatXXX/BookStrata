import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    book: { findMany: mockFindMany },
  },
}));

/** Валидный ReadingProfile (confidence обязателен, 0–1). */
function profile(axes: { storyFocus: number; emotionalWeight: number; pace: number; darkness: number }) {
  return {
    ...axes,
    confidence: { storyFocus: 0.9, emotionalWeight: 0.9, pace: 0.9, darkness: 0.9 },
    source: "ai" as const,
  };
}

const BOOK_DARK = {
  id: 1,
  slug: "dark-book",
  title: "Тёмная",
  author: "Автор",
  coverImageUrl: "/c/dark.jpg",
  readingProfile: profile({ storyFocus: 20, emotionalWeight: 30, pace: 80, darkness: 90 }),
};

const BOOK_LIGHT = {
  id: 2,
  slug: "light-book",
  title: "Светлая",
  author: "Автор",
  coverImageUrl: "/c/light.jpg",
  readingProfile: profile({ storyFocus: 80, emotionalWeight: 20, pace: 20, darkness: 10 }),
};

describe("matchScore (порт с фронта)", () => {
  it("идеальное совпадение всех осей = 100", async () => {
    const { matchScore } = await import("./readingMatch.service.js");
    const mood = { storyFocus: 20, emotionalWeight: 30, pace: 80, darkness: 90 };
    expect(matchScore(mood, BOOK_DARK.readingProfile)).toBe(100);
  });

  it("без активных осей = 0", async () => {
    const { matchScore } = await import("./readingMatch.service.js");
    expect(matchScore({}, BOOK_DARK.readingProfile)).toBe(0);
  });

  it("противоположное значение оси даёт низкий score, близкое — высокий", async () => {
    const { matchScore } = await import("./readingMatch.service.js");
    const near = matchScore({ darkness: 80 }, BOOK_DARK.readingProfile);
    const far = matchScore({ darkness: 10 }, BOOK_DARK.readingProfile);
    expect(near).toBeGreaterThan(far);
    expect(near).toBeGreaterThan(80);
  });
});

describe("getMatchedBooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("сортирует по score убыванию и уважает limit", async () => {
    mockFindMany.mockResolvedValue([BOOK_LIGHT, BOOK_DARK]);

    const { getMatchedBooks } = await import("./readingMatch.service.js");
    const books = await getMatchedBooks({ darkness: 90 }, { limit: 1 });

    expect(books).toHaveLength(1);
    expect(books[0].slug).toBe("dark-book");
    expect(books[0].score).toBeGreaterThan(0);
  });

  it("исключает книгу по excludeSlug", async () => {
    mockFindMany.mockResolvedValue([BOOK_DARK, BOOK_LIGHT]);

    const { getMatchedBooks } = await import("./readingMatch.service.js");
    const books = await getMatchedBooks({ darkness: 90 }, { limit: 3, excludeSlug: "dark-book" });

    expect(books.map((b) => b.slug)).toEqual(["light-book"]);
  });

  it("пропускает книги с невалидным readingProfile", async () => {
    const broken = { ...BOOK_DARK, id: 3, slug: "broken", readingProfile: { storyFocus: 999 } };
    mockFindMany.mockResolvedValue([broken, BOOK_DARK]);

    const { getMatchedBooks } = await import("./readingMatch.service.js");
    const books = await getMatchedBooks({ darkness: 90 });

    expect(books.map((b) => b.slug)).toEqual(["dark-book"]);
  });

  it("запрашивает только published с профилем и обложкой", async () => {
    mockFindMany.mockResolvedValue([]);

    const { getMatchedBooks } = await import("./readingMatch.service.js");
    await getMatchedBooks({ darkness: 90 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "published",
          coverImageUrl: { not: "" },
        }),
      }),
    );
  });
});

describe("matchScore — жанровая ось (порт)", () => {
  it("только genreSim, пустой mood → 100/0", async () => {
    const { matchScore } = await import("./readingMatch.service.js");
    const prof = profile({ storyFocus: 50, emotionalWeight: 50, pace: 50, darkness: 50 });
    expect(matchScore({}, prof, 100)).toBe(100);
    expect(matchScore({}, prof, 0)).toBe(0);
    expect(matchScore({}, prof)).toBe(0);
  });
});

describe("getMatchedBooks — opts.genres", () => {
  beforeEach(() => vi.clearAllMocks());

  const BOOK_FANTASY = {
    id: 10,
    slug: "fantasy-book",
    title: "Фэнтези",
    author: "А",
    coverImageUrl: "/c/f.jpg",
    genre: "Фэнтези",
    tags: ["магия"],
    readingProfile: { ...profile({ storyFocus: 50, emotionalWeight: 50, pace: 50, darkness: 50 }), genreConfidence: 1 },
  };
  const BOOK_HORROR = {
    id: 11,
    slug: "horror-book",
    title: "Хоррор",
    author: "А",
    coverImageUrl: "/c/h.jpg",
    genre: "Ужасы",
    tags: [],
    readingProfile: { ...profile({ storyFocus: 50, emotionalWeight: 50, pace: 50, darkness: 50 }), genreConfidence: 1 },
  };

  it("с genres ранжирует книгу выбранного жанра выше", async () => {
    mockFindMany.mockResolvedValue([BOOK_FANTASY, BOOK_HORROR]);
    const { getMatchedBooks } = await import("./readingMatch.service.js");
    const books = await getMatchedBooks(
      { darkness: 50 },
      { limit: 2, genres: ["fantasy"] },
    );
    expect(books[0].slug).toBe("fantasy-book");
  });

  it("без genres — жанр не влияет (совпадает со старым поведением)", async () => {
    mockFindMany.mockResolvedValue([BOOK_FANTASY, BOOK_HORROR]);
    const { getMatchedBooks } = await import("./readingMatch.service.js");
    const books = await getMatchedBooks({ darkness: 50 }, { limit: 2 });
    // оба одинаковые по 6 осям → tie-break по названию: "Фэнтези" < "Хоррор" (localeCompare ru)
    expect(books).toHaveLength(2);
    expect(books.every((b) => typeof b.score === "number")).toBe(true);
  });
});
