import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Моки ───

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: any) => Promise<unknown>) => fn(mockTx)),
    author: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    book: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    collectionBook: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    celebrityBook: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    bookPlacement: { count: vi.fn() },
    bookComment: { count: vi.fn() },
    bookLike: { count: vi.fn() },
    bookStatus: { count: vi.fn() },
  },
}));

vi.mock("./bookMatching.service.js", () => ({
  matchBook: vi.fn(),
}));

vi.mock("./bookPublish.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./bookPublish.service.js")>();
  return { ...actual, publishBookTx: vi.fn() };
});

const mockTx = {
  $queryRaw: vi.fn(),
  author: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  book: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
  collectionBook: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  celebrityBook: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  bookPlacement: { count: vi.fn() },
  bookComment: { count: vi.fn() },
  bookLike: { count: vi.fn() },
  bookStatus: { count: vi.fn() },
};

import { prisma } from "../../lib/prisma.js";
import { matchBook } from "./bookMatching.service.js";
import { publishBookTx } from "./bookPublish.service.js";
import {
  syncCatalogCards,
  gcOrphanBooks,
  isCatalogCardComplete,
} from "./bookCatalogSync.service.js";

const matchBookMock = matchBook as unknown as ReturnType<typeof vi.fn>;
const publishBookTxMock = publishBookTx as unknown as ReturnType<typeof vi.fn>;

function authorCreated() {
  return { id: 1, name: "Автор", slug: "avtor" };
}

function canon(partial: Record<string, unknown> = {}) {
  return {
    id: 7,
    title: "Дюна",
    author: "Фрэнк Герберт",
    authorId: 2,
    coverImageUrl: "/cover.jpg",
    slug: "dyuna",
    status: "draft",
    source: null,
    externalId: null,
    publishedYear: 1965,
    rating: null,
    ...partial,
  };
}

const FULL_CARD = {
  title: "Дюна",
  author: "Фрэнк Герберт",
  coverImageUrl: "https://card-cover.example/dune.jpg",
  description: "Первый роман цикла",
  genre: "Фантастика",
  tags: ["фантастика", "классика"],
  year: 1965,
};

describe("isCatalogCardComplete", () => {
  it("полная карточка (все поля, включая year) — true", () => {
    expect(isCatalogCardComplete(FULL_CARD)).toBe(true);
  });

  it("без year — false (строгий порог Фазы 0)", () => {
    expect(isCatalogCardComplete({ ...FULL_CARD, year: undefined })).toBe(false);
  });

  it("без genre — false", () => {
    expect(isCatalogCardComplete({ ...FULL_CARD, genre: undefined })).toBe(false);
  });
});

describe("syncCatalogCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Авторы: существующих нет — findOrCreate создаст
    (prisma.author.findMany as any).mockResolvedValue([]);
    (prisma.author.findFirst as any).mockResolvedValue(null);
    (prisma.author.findUnique as any).mockResolvedValue(null);
    (prisma.author.create as any).mockResolvedValue(authorCreated());
    (mockTx.author.findMany as any).mockResolvedValue([]);
    (mockTx.author.findFirst as any).mockResolvedValue(null);
    (mockTx.author.findUnique as any).mockResolvedValue(null);
    (mockTx.author.create as any).mockResolvedValue(authorCreated());
    (mockTx.book.create as any).mockResolvedValue({ id: 42 });
    (mockTx.book.update as any).mockResolvedValue({});
    (mockTx.book.delete as any).mockResolvedValue({});
    (mockTx.collectionBook.upsert as any).mockResolvedValue({});
    (mockTx.collectionBook.findMany as any).mockResolvedValue([]);
    (mockTx.collectionBook.deleteMany as any).mockResolvedValue({});
    (mockTx.celebrityBook.upsert as any).mockResolvedValue({});
    (mockTx.celebrityBook.findMany as any).mockResolvedValue([]);
    (mockTx.celebrityBook.deleteMany as any).mockResolvedValue({});
    (mockTx.bookPlacement.count as any).mockResolvedValue(0);
    (mockTx.collectionBook.count as any).mockResolvedValue(0);
    (mockTx.celebrityBook.count as any).mockResolvedValue(0);
    (mockTx.bookComment.count as any).mockResolvedValue(0);
    (mockTx.bookLike.count as any).mockResolvedValue(0);
    (mockTx.bookStatus.count as any).mockResolvedValue(0);
    matchBookMock.mockResolvedValue({ book: null, confidence: null, candidates: [] });
    publishBookTxMock.mockResolvedValue({});
  });

  it("новая неполная карточка → создаёт draft + связь, не публикует", async () => {
    const result = await syncCatalogCards("collection", 5, {
      k1: { title: "Книга", author: "Автор" },
    });

    expect(result).toEqual({ created: 1, linked: 0, deleted: 0, published: 0 });
    expect(mockTx.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Книга",
          author: "Автор",
          authorId: 1,
          status: "draft",
          publishedYear: null,
          coverImageUrl: "",
        }),
      }),
    );
    expect(publishBookTxMock).not.toHaveBeenCalled();
    expect(mockTx.collectionBook.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collectionId_bookId: { collectionId: 5, bookId: 42 } },
        create: expect.objectContaining({ rank: 0, rating: null, tierId: null }),
      }),
    );
  });

  it("полная карточка → создаёт книгу и публикует через publishBookTx", async () => {
    const result = await syncCatalogCards("collection", 5, { k1: FULL_CARD });

    expect(result.published).toBe(1);
    expect(mockTx.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Дюна", status: "draft", publishedYear: 1965 }),
      }),
    );
    expect(publishBookTxMock).toHaveBeenCalledWith(mockTx, 42);
  });

  it("канон найден → эталонное обновление (genre/tags/description/year), НЕ title/author/cover", async () => {
    matchBookMock.mockResolvedValue({
      book: canon({ status: "published" }),
      confidence: "HIGH",
      candidates: [],
    });

    await syncCatalogCards("collection", 5, {
      k1: { ...FULL_CARD, rating: 8.8 },
    });

    // Эталонное обновление + синхронизация Book.rating
    expect(mockTx.book.update).toHaveBeenCalledTimes(2);
    const updates = (mockTx.book.update as any).mock.calls.map((c: any) => c[0].data);
    const canonical = updates.find((d: any) => d.genre === "Фантастика");
    expect(canonical).toEqual({
      genre: "Фантастика",
      tags: ["фантастика", "классика"],
      description: "Первый роман цикла",
      publishedYear: 1965,
    });
    // Карточка НЕ трогает title/author/coverImageUrl каталога
    for (const d of updates) {
      expect(d.title).toBeUndefined();
      expect(d.author).toBeUndefined();
      expect(d.coverImageUrl).toBeUndefined();
    }
    expect(updates.some((d: any) => d.rating === 8.8)).toBe(true);

    // Связь с rating карточки
    expect(mockTx.collectionBook.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ rating: 8.8, rank: 0 }),
      }),
    );
    // Канон уже published → повторной публикации не нужно
    expect(publishBookTxMock).not.toHaveBeenCalled();
    // Новой книги не создаём
    expect(mockTx.book.create).not.toHaveBeenCalled();
  });

  it("канон — draft-книга пользователя → НЕ линкуемся, создаём новую каталоговую книгу", async () => {
    // matchBook вернул draft (книга из чужого тир-листа) — каталог не должен
    // трогать/публиковать пользовательскую книгу (решение 17.08)
    matchBookMock.mockResolvedValue({
      book: canon({ status: "draft" }),
      confidence: "HIGH",
      candidates: [],
    });

    const result = await syncCatalogCards("collection", 5, { k1: FULL_CARD });

    // Создаётся СВОЯ книга каталога
    expect(mockTx.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Дюна", status: "draft" }),
      }),
    );
    // Публикуется новая книга (карточка полная)
    expect(publishBookTxMock).toHaveBeenCalledWith(mockTx, 42);
    // Пользовательская draft НЕ патчится
    expect(mockTx.book.update).not.toHaveBeenCalled();
    // Связь ведёт на новую книгу
    expect(mockTx.collectionBook.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collectionId_bookId: { collectionId: 5, bookId: 42 } },
      }),
    );
    expect(result).toEqual({ created: 1, linked: 0, deleted: 0, published: 1 });
  });

  it("матчинг каталога вызывается с statusFilter: published", async () => {
    await syncCatalogCards("collection", 5, { k1: { title: "Книга", author: "Автор" } });

    expect(matchBookMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Книга", author: "Автор" }),
      { statusFilter: "published", fuzzy: false },
    );
  });

  it("канон уже published → повторная публикация не вызывается", async () => {
    matchBookMock.mockResolvedValue({
      book: canon({ status: "published" }),
      confidence: "HIGH",
      candidates: [],
    });

    await syncCatalogCards("collection", 5, { k1: FULL_CARD });

    expect(publishBookTxMock).not.toHaveBeenCalled();
  });

  it("карточка без rating не трогает Book.rating", async () => {
    matchBookMock.mockResolvedValue({
      book: canon({ status: "published" }),
      confidence: "HIGH",
      candidates: [],
    });

    await syncCatalogCards("collection", 5, {
      k1: { ...FULL_CARD, rating: undefined },
    });

    const updates = (mockTx.book.update as any).mock.calls.map((c: any) => c[0].data);
    expect(updates.some((d: any) => "rating" in d)).toBe(false);
  });

  it("tags строкой нормализуются в массив", async () => {
    await syncCatalogCards("collection", 5, {
      k1: { title: "Книга", tags: "фантастика, приключения" },
    });

    expect(mockTx.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tags: ["фантастика", "приключения"] }),
      }),
    );
  });

  it("исчезнувшая карточка → связь удалена, книга-сирота удаляется GC", async () => {
    (mockTx.collectionBook.findMany as any).mockResolvedValue([{ bookId: 9 }]);

    const result = await syncCatalogCards("collection", 5, {});

    expect(result.deleted).toBe(1);
    expect(mockTx.collectionBook.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: 5, bookId: { in: [9] } },
    });
    expect(mockTx.book.delete).toHaveBeenCalledWith({ where: { id: 9 } });
  });

  it("книга с другими привязками (placement) не удаляется", async () => {
    (mockTx.collectionBook.findMany as any).mockResolvedValue([{ bookId: 9 }]);
    (mockTx.bookPlacement.count as any).mockResolvedValue(1);

    const result = await syncCatalogCards("collection", 5, {});

    expect(result.deleted).toBe(0);
    expect(mockTx.book.delete).not.toHaveBeenCalled();
  });

  it("гонка P2002 → вся транзакция перезапускается (retry), книга создаётся со второй попытки", async () => {
    const p2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    (mockTx.book.create as any).mockRejectedValueOnce(p2002).mockResolvedValue({ id: 42 });

    const result = await syncCatalogCards("collection", 5, {
      k1: { title: "Дюна", author: "Фрэнк Герберт" },
    });

    // Первая попытка упала (P2002 abort'ит tx), вторая — успешна
    expect(mockTx.book.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ created: 1, linked: 0, deleted: 0, published: 0 });
    expect(mockTx.collectionBook.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collectionId_bookId: { collectionId: 5, bookId: 42 } },
      }),
    );
  });

  it("slug занят published-книгой → создаётся с суффиксом (-2) без P2002/E25P02", async () => {
    // Регрессия: сохранение коллекции падало 500, когда книга каталога уже
    // занимала slug (P2002 abort'ил транзакцию, E25P02 на следующем запросе).
    // Pre-check findUnique находит занятый slug → сразу суффикс, create не падает.
    (mockTx.book.findUnique as any).mockResolvedValueOnce({ id: 50, status: "published" });
    (mockTx.book.create as any).mockResolvedValue({ id: 42 });

    const result = await syncCatalogCards("collection", 5, {
      k1: { title: "Алхимизированные", author: "СенЛинЮ" },
    });

    expect(mockTx.book.create).toHaveBeenCalledTimes(1);
    expect(mockTx.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: expect.stringMatching(/-2$/) }),
      }),
    );
    expect(mockTx.book.update).not.toHaveBeenCalled();
    expect(result.created).toBe(1);
    expect(mockTx.collectionBook.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collectionId_bookId: { collectionId: 5, bookId: 42 } },
      }),
    );
  });

  it("slug занят draft-книгой → draft переименовывается, каталог забирает чистый slug", async () => {
    (mockTx.book.findUnique as any).mockResolvedValueOnce({ id: 50, status: "draft" });
    (mockTx.book.create as any).mockResolvedValue({ id: 42 });

    const result = await syncCatalogCards("collection", 5, {
      k1: { title: "Дюна", author: "Фрэнк Герберт" },
    });

    expect(mockTx.book.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 50 }, data: { slug: null } }),
    );
    expect(mockTx.book.create).toHaveBeenCalledTimes(1);
    expect(mockTx.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "dyuna-frenk-gerbert" }),
      }),
    );
    expect(result.created).toBe(1);
  });

  it("celebrity: связи идут в celebrityBook", async () => {
    await syncCatalogCards("celebrity", 3, { k1: { title: "Книга" } });

    expect(mockTx.celebrityBook.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { celebrityId_bookId: { celebrityId: 3, bookId: 42 } },
      }),
    );
    expect(mockTx.collectionBook.upsert).not.toHaveBeenCalled();
  });
});

describe("gcOrphanBooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("книга без привязок удаляется", async () => {
    (prisma.collectionBook.count as any).mockResolvedValue(0);
    (prisma.celebrityBook.count as any).mockResolvedValue(0);
    (prisma.bookPlacement.count as any).mockResolvedValue(0);
    (prisma.bookComment.count as any).mockResolvedValue(0);
    (prisma.bookLike.count as any).mockResolvedValue(0);
    (prisma.bookStatus.count as any).mockResolvedValue(0);

    const deleted = await gcOrphanBooks([9, 10]);

    expect(deleted).toBe(2);
    expect(prisma.book.delete).toHaveBeenCalledTimes(2);
  });

  it("книга с комментарием/лайком/статусом не удаляется", async () => {
    (prisma.collectionBook.count as any).mockResolvedValue(0);
    (prisma.celebrityBook.count as any).mockResolvedValue(0);
    (prisma.bookPlacement.count as any).mockResolvedValue(0);
    (prisma.bookComment.count as any).mockResolvedValue(1);
    (prisma.bookLike.count as any).mockResolvedValue(0);
    (prisma.bookStatus.count as any).mockResolvedValue(0);

    const deleted = await gcOrphanBooks([9]);

    expect(deleted).toBe(0);
    expect(prisma.book.delete).not.toHaveBeenCalled();
  });
});