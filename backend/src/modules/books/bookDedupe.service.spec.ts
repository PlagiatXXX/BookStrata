import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    book: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bookPlacement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    bookRating: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bookStatus: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    collectionBook: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    celebrityBook: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma.js";
import {
  normalizeTitle,
  collectDuplicateGroups,
  pickCanon,
  mergeGroup,
  type DuplicateGroup,
} from "./bookDedupe.service.js";

interface RawBook {
  id: number;
  title: string;
  authorId: number | null;
  coverImageUrl: string;
  description: string | null;
  publishedAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  source: string | null;
  externalId: string | null;
  _count: Record<string, number>;
}

const now = new Date("2026-08-13T00:00:00Z");

function rawBook(partial: Partial<RawBook>): RawBook {
  return {
    id: 1,
    title: "Война и мир",
    authorId: 10,
    coverImageUrl: "/cover.jpg",
    description: "desc",
    publishedAt: null,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    source: null,
    externalId: null,
    _count: {
      placements: 0,
      ratings: 0,
      statuses: 0,
      collectionBooks: 0,
      celebrityBooks: 0,
      comments: 0,
      likes: 0,
    },
    ...partial,
  };
}

describe("normalizeTitle", () => {
  it("приводит к нижнему регистру, тримит, схлопывает пробелы, ё→е", () => {
    expect(normalizeTitle("  Война и мир  ")).toBe("война и мир");
    expect(normalizeTitle("Ёлка   и    Пень")).toBe("елка и пень");
  });
});

describe("collectDuplicateGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("группирует только полные дубли: (source, externalId) и точные (title, authorId)", async () => {
    (prisma.book.findMany as any).mockResolvedValue([
      rawBook({ id: 1, title: "1984", authorId: 5, source: "google_books", externalId: "vol-1" }),
      rawBook({ id: 2, title: "1984", authorId: 5, source: "google_books", externalId: "vol-1" }),
      rawBook({ id: 3, title: "1984", authorId: 5 }),
      rawBook({ id: 4, title: "1984", authorId: 5 }),
      rawBook({ id: 5, title: "1984", authorId: 6 }),
      rawBook({ id: 6, title: "Скотный двор", authorId: 5 }),
    ]);

    const groups = await collectDuplicateGroups();

    expect(groups.length).toBe(2);
    const keys = groups.map((g) => g.key).sort();
    expect(keys).toContain("ext:google_books:vol-1");
    expect(keys).toContain("local:1984:5");
  });

  it("НЕ склеивает вариации названий и разных авторов (Book = издание)", async () => {
    (prisma.book.findMany as any).mockResolvedValue([
      rawBook({ id: 1, title: "Война и мир", authorId: 10 }),
      rawBook({ id: 2, title: "War and Peace", authorId: 10 }),
      rawBook({ id: 3, title: "Война и мир", authorId: 11 }),
    ]);

    const groups = await collectDuplicateGroups();

    expect(groups.length).toBe(0);
  });

  it("книги без автора группируются только по точному названию (authorId=0)", async () => {
    (prisma.book.findMany as any).mockResolvedValue([
      rawBook({ id: 1, title: "Аноним", authorId: null }),
      rawBook({ id: 2, title: "Аноним", authorId: null }),
      rawBook({ id: 3, title: "Аноним", authorId: 7 }),
    ]);

    const groups = await collectDuplicateGroups();

    expect(groups.length).toBe(1);
    expect(groups[0]!.key).toBe("local:аноним:0");
    expect(groups[0]!.books.map((b) => b.id).sort()).toEqual([1, 2]);
  });
});

describe("pickCanon", () => {
  const book = (partial: Partial<DuplicateGroup["books"][number]>): DuplicateGroup["books"][number] => ({
    id: 1,
    title: "t",
    authorId: 1,
    coverImageUrl: "",
    description: null,
    publishedAt: null,
    status: "draft",
    createdAt: new Date("2020-01-01"),
    updatedAt: new Date("2020-01-01"),
    placementsCount: 0,
    ratingsCount: 0,
    statusesCount: 0,
    collectionBooksCount: 0,
    celebrityBooksCount: 0,
    commentsCount: 0,
    likesCount: 0,
    ...partial,
  });

  it("канон — с большим числом placements (вес *3)", () => {
    const canon = pickCanon([
      book({ id: 1, placementsCount: 1, coverImageUrl: "/a.jpg" }),
      book({ id: 2, placementsCount: 2 }),
    ]);
    expect(canon.id).toBe(2);
  });

  it("при равном score published первее draft", () => {
    const canon = pickCanon([
      book({ id: 1, status: "draft", coverImageUrl: "/a.jpg" }),
      book({ id: 2, status: "published", coverImageUrl: "/b.jpg" }),
    ]);
    expect(canon.id).toBe(2);
  });

  it("при полном равенстве — самый старый createdAt (детерминизм)", () => {
    const canon = pickCanon([
      book({ id: 1, createdAt: new Date("2021-06-01"), coverImageUrl: "/a.jpg", updatedAt: new Date("2021-06-01") }),
      book({ id: 2, createdAt: new Date("2020-01-01"), coverImageUrl: "/b.jpg", updatedAt: new Date("2021-06-01") }),
    ]);
    expect(canon.id).toBe(2);
  });

  it("бросает ошибку на пустой группе", () => {
    expect(() => pickCanon([])).toThrow("пустая группа");
  });
});

describe("mergeGroup", () => {
  const groupBook = (id: number): DuplicateGroup["books"][number] => ({
    id,
    title: `book-${id}`,
    authorId: 1,
    coverImageUrl: "/a.jpg",
    description: null,
    publishedAt: null,
    status: "draft",
    createdAt: new Date("2020-01-01"),
    updatedAt: new Date("2020-01-01"),
    placementsCount: 0,
    ratingsCount: 0,
    statusesCount: 0,
    collectionBooksCount: 0,
    celebrityBooksCount: 0,
    commentsCount: 0,
    likesCount: 0,
  });

  const group: DuplicateGroup = { key: "local:book:1", books: [groupBook(1), groupBook(2)] };

  beforeEach(() => {
    vi.clearAllMocks();
    // Дефолты: пустые выборки по всем связям (mergeGroup итерирует findMany)
    (prisma.bookPlacement.findMany as any).mockResolvedValue([]);
    (prisma.bookRating.findMany as any).mockResolvedValue([]);
    (prisma.bookStatus.findMany as any).mockResolvedValue([]);
    (prisma.collectionBook.findMany as any).mockResolvedValue([]);
    (prisma.celebrityBook.findMany as any).mockResolvedValue([]);
    (prisma.bookPlacement.findUnique as any).mockResolvedValue(null);
    (prisma.bookRating.findUnique as any).mockResolvedValue(null);
    (prisma.bookStatus.findUnique as any).mockResolvedValue(null);
    (prisma.collectionBook.findUnique as any).mockResolvedValue(null);
    (prisma.celebrityBook.findUnique as any).mockResolvedValue(null);
    // Неканон (id=2) пуст после переноса → удаляется
    (prisma.book.findUnique as any).mockResolvedValue({
      id: 2,
      _count: {
        placements: 0,
        ratings: 0,
        statuses: 0,
        collectionBooks: 0,
        celebrityBooks: 0,
        comments: 0,
        likes: 0,
      },
    });
  });

  it("переносит placements, пропуская конфликты (P2002/канон уже в листе)", async () => {
    (prisma.bookPlacement.findMany as any).mockResolvedValue([
      { tierListId: "tl-1", bookId: 2, tierId: 1, rank: 0 },
      { tierListId: "tl-2", bookId: 2, tierId: null, rank: 1 },
    ]);
    (prisma.bookPlacement.findUnique as any)
      .mockResolvedValueOnce(null) // tl-1 свободен → переносим
      .mockResolvedValueOnce({ tierListId: "tl-2", bookId: 1 }); // tl-2 конфликт → пропуск

    await mergeGroup(group);

    expect(prisma.bookPlacement.update).toHaveBeenCalledTimes(1);
    expect(prisma.bookPlacement.update).toHaveBeenCalledWith({
      where: { tierListId_bookId: { tierListId: "tl-1", bookId: 2 } },
      data: { bookId: 1 },
    });
    expect(prisma.book.delete).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  it("BookRating: при конфликте пользователя остаётся новейшая оценка", async () => {
    (prisma.bookRating.findMany as any).mockResolvedValue([
      { id: 20, bookId: 2, userId: 7, createdAt: new Date("2026-01-10") },
    ]);
    // у канона уже есть оценка пользователя 7 — старше дубля
    (prisma.bookRating.findUnique as any).mockResolvedValue({
      id: 10,
      bookId: 1,
      userId: 7,
      createdAt: new Date("2026-01-01"),
    });

    await mergeGroup(group);

    // Старая оценка канона удалена, дубль перенесён на канон
    expect(prisma.bookRating.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(prisma.bookRating.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { bookId: 1 },
    });
  });

  it("BookRating: если оценка канона новее — дубль удаляется", async () => {
    (prisma.bookRating.findMany as any).mockResolvedValue([
      { id: 20, bookId: 2, userId: 7, createdAt: new Date("2026-01-01") },
    ]);
    (prisma.bookRating.findUnique as any).mockResolvedValue({
      id: 10,
      bookId: 1,
      userId: 7,
      createdAt: new Date("2026-01-10"),
    });

    await mergeGroup(group);

    expect(prisma.bookRating.delete).toHaveBeenCalledWith({ where: { id: 20 } });
    expect(prisma.bookRating.update).not.toHaveBeenCalled();
  });

  it("переносит CollectionBook/CelebrityBook, пропуская конфликты", async () => {
    (prisma.collectionBook.findMany as any).mockResolvedValue([
      { id: 30, collectionId: 5, bookId: 2, rank: 0 },
    ]);
    (prisma.celebrityBook.findMany as any).mockResolvedValue([
      { id: 40, celebrityId: 8, bookId: 2, rank: 1 },
    ]);
    (prisma.collectionBook.findUnique as any).mockResolvedValue(null);
    (prisma.celebrityBook.findUnique as any).mockResolvedValue({
      id: 41,
      celebrityId: 8,
      bookId: 1,
    });

    await mergeGroup(group);

    expect(prisma.collectionBook.update).toHaveBeenCalledWith({
      where: { id: 30 },
      data: { bookId: 1 },
    });
    // конфликт у знаменитости — не переносим
    expect(prisma.celebrityBook.update).not.toHaveBeenCalled();
  });

  it("НЕ удаляет неканон, если остались привязки (например, комментарии)", async () => {
    (prisma.book.findUnique as any).mockResolvedValue({
      id: 2,
      _count: {
        placements: 0,
        ratings: 0,
        statuses: 0,
        collectionBooks: 0,
        celebrityBooks: 0,
        comments: 2,
        likes: 0,
      },
    });

    await mergeGroup(group);

    expect(prisma.book.delete).not.toHaveBeenCalled();
    expect(prisma.book.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { mergedIntoId: 1 },
    });
  });

  it("проставляет mergedIntoId для аудита", async () => {
    await mergeGroup(group);

    expect(prisma.book.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { mergedIntoId: 1 },
    });
  });
});
