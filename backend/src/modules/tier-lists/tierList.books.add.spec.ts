import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  matchBook: vi.fn(),
}));

// Мок матчинга каталога: новые ветки управляются через mocks.matchBook,
// а существующие тесты получают «каталог не найден» (см. beforeEach)
vi.mock("../books/bookMatching.service.js", () => ({
  matchBook: mocks.matchBook,
}));

// Моки Prisma: минимальный набор для addBooksToTierList (решение 17.08:
// локальные книги не матчатся — каждому пользователю свой оригинал;
// матчинг только по внешнему ID (source + externalId) среди draft)
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    tierList: {
      findUnique: vi.fn().mockResolvedValue({ id: "1" }),
    },
    author: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((data: any) =>
        Promise.resolve({ id: 999, ...data }),
      ),
    },
    book: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    bookPlacement: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../lib/prisma.js";
import { addBooksToTierList } from "./tierList.books.service.js";

const p2002 = (target: unknown) => {
  const err = new Error("Unique constraint failed") as Error & {
    code: string;
    meta: { target: unknown };
  };
  err.code = "P2002";
  err.meta = { target };
  return err;
};

const userBook = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  title: "1984",
  author: "Orwell",
  authorId: 999,
  coverImageUrl: "/cover.jpg",
  slug: null,
  status: "draft",
  source: null,
  externalId: null,
  publishedYear: null,
  rating: null,
  ...overrides,
});

describe("addBooksToTierList: конкурентная защита (P2002 → retry → link)", () => {
  const book = {
    title: "1984",
    author: "Orwell",
    coverImageUrl: "cover.jpg",
    externalId: "vol-1",
    source: "google_books" as const,
  };

  beforeEach(() => {
    // resetAllMocks — обязателен: clearAllMocks НЕ сбрасывает once-очереди
    vi.resetAllMocks();
    // Каталог по умолчанию не находит книгу (существующие тесты)
    mocks.matchBook.mockResolvedValue({ book: null, confidence: null, candidates: [] });
    (prisma.tierList.findUnique as any).mockResolvedValue({ id: "1" });
    (prisma.author.findFirst as any).mockResolvedValue(null);
    (prisma.author.findUnique as any).mockResolvedValue(null);
    (prisma.author.findMany as any).mockResolvedValue([]);
    (prisma.author.create as any).mockImplementation((data: any) =>
      Promise.resolve({ id: 999, ...data }),
    );
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.book.findUnique as any).mockResolvedValue(null);
    (prisma.bookPlacement.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);
    (prisma.bookPlacement.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ tierListId: "1", tierId: null, ...data, book: { id: data.bookId } }),
    );
    (prisma.$transaction as any).mockImplementation((fn: any) => fn(prisma));
  });

  it("гонка на unique (source, externalId): канон-draft → link вместо дубля", async () => {
    // Параллельный запрос уже создал книгу: create падает (target — не slug)
    (prisma.book.create as any).mockRejectedValueOnce(p2002(["source", "externalId"]));
    // findRaceCanon находит победителя — пользовательскую (draft) книгу
    (prisma.book.findFirst as any)
      .mockResolvedValueOnce(null) // дедуп по (source, externalId) среди draft: ещё не видна
      .mockResolvedValueOnce(userBook(7)); // findRaceCanon: нашёл после гонки

    const result = await addBooksToTierList("1", [book]);

    expect(prisma.book.create).toHaveBeenCalledTimes(1);
    expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bookId: 7, tierListId: "1" }),
      }),
    );
    expect(result[0]?.book?.id).toBe(7);
  });

  it("гонка: канон оказался КАТАЛОГОВЫМ (published) → не линкуемся, ошибка (без локальной копии)", async () => {
    (prisma.book.create as any).mockRejectedValueOnce(p2002(["source", "externalId"]));
    // findExistingUserBook (externalId-дедуп) не нашёл; findRaceCanon нашёл каталоговую
    (prisma.book.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(userBook(7, { status: "published", slug: "1984" }));

    // Каталог уже проверен matchBook до создания (не найден), значит это гонка
    // с чужой записью — ошибка, локальная копия не создаётся (единый каталог, 19.08)
    await expect(addBooksToTierList("1", [book])).rejects.toThrow(
      "Unique constraint failed",
    );
    expect(prisma.book.create).toHaveBeenCalledTimes(1);
    expect(prisma.bookPlacement.create).not.toHaveBeenCalled();
  });

  it("конфликт именно по slug → retry-цикл с суффиксом (-2), без link", async () => {
    // Slug занят существующей книгой — pre-check (findUnique до create)
    // находит её, createBookWithSlug сразу переходит на суффикс -2
    // (без P2002, который abort'ил бы транзакцию)
    (prisma.book.findUnique as any).mockResolvedValueOnce(userBook(50));
    (prisma.book.create as any).mockImplementationOnce(({ data }: any) =>
      Promise.resolve({ id: 100, ...data }),
    );

    const result = await addBooksToTierList("1", [book]);

    expect(prisma.book.create).toHaveBeenCalledTimes(1);
    expect(prisma.book.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: expect.stringMatching(/-2$/) }),
      }),
    );
    expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bookId: 100 }) }),
    );
    expect(result[0]?.book?.id).toBe(100);
  });

  it("канон не найден после P2002 → ошибка пробрасывается (не линкуем вслепую)", async () => {
    (prisma.book.create as any).mockRejectedValueOnce(p2002(["source", "externalId"]));
    // Дедуп и перезапрос не нашли канон (победитель уже удалён/откатился)
    (prisma.book.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(addBooksToTierList("1", [book])).rejects.toThrow(
      "Unique constraint failed",
    );
    expect(prisma.bookPlacement.create).not.toHaveBeenCalled();
  });

  it("локальная книга не матчится по (title, author) — создаётся свой оригинал", async () => {
    // В базе есть draft с тем же названием (queryRaw нашёл бы её), но локальные
    // книги не матчатся: каждому пользователю — свой оригинал (решение 17.08)
    (prisma.$queryRaw as any).mockResolvedValue([{ id: 7 }]);
    (prisma.book.create as any).mockResolvedValue({ id: 100, status: "draft" });

    const result = await addBooksToTierList("1", [
      { title: "1984", author: "Orwell", coverImageUrl: "cover.jpg" },
    ]);

    expect(prisma.book.create).toHaveBeenCalledTimes(1);
    expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bookId: 100 }) }),
    );
    expect(result[0]?.book?.id).toBe(100);
  });
});

describe("addBooksToTierList: матчинг с каталогом (published)", () => {
  const book = {
    title: "1984",
    author: "Orwell",
    coverImageUrl: "cover.jpg",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.matchBook.mockReset();
    mocks.matchBook.mockResolvedValue({ book: null, confidence: null, candidates: [] });
    (prisma.tierList.findUnique as any).mockResolvedValue({ id: "1" });
    (prisma.author.findFirst as any).mockResolvedValue(null);
    (prisma.author.findUnique as any).mockResolvedValue(null);
    (prisma.author.findMany as any).mockResolvedValue([]);
    (prisma.author.create as any).mockImplementation((data: any) =>
      Promise.resolve({ id: 999, ...data }),
    );
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.book.findUnique as any).mockResolvedValue(null);
    (prisma.bookPlacement.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);
    (prisma.bookPlacement.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ tierListId: "1", tierId: null, ...data, book: { id: data.bookId } }),
    );
    (prisma.$transaction as any).mockImplementation((fn: any) => fn(prisma));
  });

  it("каталог найден по (title, author) → линк на канон, draft не создаётся", async () => {
    mocks.matchBook.mockResolvedValue({
      book: {
        id: 55,
        title: "1984",
        author: "Orwell",
        authorId: 999,
        coverImageUrl: "/cat.jpg",
        slug: "1984",
        status: "published",
        source: null,
        externalId: null,
        publishedYear: null,
        rating: null,
      },
      confidence: "HIGH",
      candidates: [],
    });

    const result = await addBooksToTierList("1", [book]);

    expect(mocks.matchBook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "1984", author: "Orwell", authorId: 999 }),
      expect.objectContaining({ statusFilter: "published", fuzzy: false }),
    );
    expect(prisma.book.create).not.toHaveBeenCalled();
    expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bookId: 55 }) }),
    );
    expect(result[0]?.book?.id).toBe(55);
  });

  it("каталог не найден, своя draft найдена → линк на свою (модель «личные книги»)", async () => {
    (prisma.book.findMany as any).mockResolvedValueOnce([
      userBook(7, { source: null, externalId: null }),
    ]);

    const result = await addBooksToTierList("1", [book]);

    expect(prisma.book.create).not.toHaveBeenCalled();
    expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bookId: 7 }) }),
    );
    expect(result[0]?.book?.id).toBe(7);
  });

  it("без автора → каталог не матчится, создаётся своя draft", async () => {
    (prisma.book.create as any).mockResolvedValue({ id: 100, status: "draft" });

    const result = await addBooksToTierList("1", [
      { title: "1984", author: "", coverImageUrl: "cover.jpg" },
    ]);

    expect(mocks.matchBook).not.toHaveBeenCalled();
    expect(prisma.book.create).toHaveBeenCalledTimes(1);
    expect(result[0]?.book?.id).toBe(100);
  });
});