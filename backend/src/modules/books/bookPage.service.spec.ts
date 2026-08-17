import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    book: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    collection: { findMany: vi.fn() },
    celebrity: { findMany: vi.fn() },
    bookComment: { findMany: vi.fn(), count: vi.fn() },
    bookLike: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "../../lib/prisma.js";
import { getBookPageData } from "./bookPage.service.js";

const publishedBook = {
  id: 1,
  slug: "voyna-i-mir",
  title: "Война и мир",
  author: "Лев Толстой",
  authorId: 10,
  coverImageUrl: "/cover.jpg",
  description: "Роман-эпопея",
  genre: "Классика",
  tags: ["роман", "война"],
  status: "published",
  rating: 9.1,
  likesCount: 5,
  contextChain: [{ icon: "📖", title: "Факт", text: "Текст" }],
  authorRel: { id: 10, name: "Лев Толстой", slug: "lev-tolstoy" },
};

const draftBook = { ...publishedBook, id: 2, slug: "draft-book", status: "draft" };

describe("getBookPageData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("возвращает null, если книга не найдена", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(null);
    expect(await getBookPageData("net-takoy", 1)).toBeNull();
  });

  it("возвращает null для draft-книги (404 на роуте)", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(draftBook);
    expect(await getBookPageData("draft-book", 1)).toBeNull();
  });

  it("собирает tierLists/collections/celebrities только публичные", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    // Тир-листы матчатся по названию+автору через $queryRaw (решение 17.08)
    (prisma.$queryRaw as any).mockResolvedValue([
      { id: "t1", slug: "t-1", title: "Лист", isPublic: true },
    ]);
    (prisma.collection.findMany as any).mockResolvedValue([
      { id: 5, slug: "col-5", title: "Подборка", type: "literary" },
    ]);
    (prisma.celebrity.findMany as any).mockResolvedValue([
      { id: 7, slug: "cel-7", name: "Знаменитость" },
    ]);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.count as any).mockResolvedValue(0);
    (prisma.bookLike.findUnique as any).mockResolvedValue(null);

    const page = await getBookPageData("voyna-i-mir", 1);

    expect(page).not.toBeNull();
    expect(page!.tierLists).toHaveLength(1);
    expect(page!.collections).toHaveLength(1);
    expect(page!.celebrities).toHaveLength(1);
    // Фильтры видимости в where
    expect((prisma.collection.findMany as any).mock.calls[0][0].where.isPublished).toBe(true);
    expect((prisma.celebrity.findMany as any).mock.calls[0][0].where.isPublished).toBe(true);
    expect((prisma.collection.findMany as any).mock.calls[0][0].where.catalogBooks.some.bookId).toBe(1);
    // SQL-запрос тир-листов: только публичные + нормализованные title/author книги
    const sqlCall = (prisma.$queryRaw as any).mock.calls[0];
    expect(sqlCall[0].join(" ")).toContain('"isPublic" = true');
    expect(sqlCall[0].join(" ")).toContain("regexp_replace");
    // Нормализованные значения title/author передаются параметрами
    expect(sqlCall).toContain("война и мир");
    expect(sqlCall).toContain("лев толстой");
  });

  it("similarBooks: AND статуса + OR по жанру/тегам, лимит 8", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    (prisma.book.findMany as any).mockResolvedValue([{ id: 3 }]);
    (prisma.$queryRaw as any).mockResolvedValue([]);
    (prisma.collection.findMany as any).mockResolvedValue([]);
    (prisma.celebrity.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.count as any).mockResolvedValue(0);

    const page = await getBookPageData("voyna-i-mir");

    const similarArgs = (prisma.book.findMany as any).mock.calls[0][0];
    expect(similarArgs.where.status).toBe("published");
    expect(similarArgs.where.id.not).toBe(1);
    expect(similarArgs.where.OR).toHaveLength(2); // genre + tags
    expect(similarArgs.take).toBe(8);
    expect(page!.similarBooks).toHaveLength(1);
  });

  it("без жанра и тегов similarBooks не запрашиваются с пустым OR", async () => {
    const bare = { ...publishedBook, genre: null, tags: [] };
    (prisma.book.findUnique as any).mockResolvedValue(bare);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);
    (prisma.collection.findMany as any).mockResolvedValue([]);
    (prisma.celebrity.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.count as any).mockResolvedValue(0);

    const page = await getBookPageData("book");

    // первый findMany — это similarBooks с take 8; OR отсутствует в where
    const [similarWhere] = (prisma.book.findMany as any).mock.calls[0];
    expect(similarWhere.OR).toBeUndefined();
    expect(page!.similarBooks).toEqual([]);
  });

  it("otherBooksByAuthor: только если authorId, лимит 4, без текущей книги", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    (prisma.book.findMany as any)
      .mockResolvedValueOnce([]) // similarBooks
      .mockResolvedValueOnce([{ id: 11 }]); // otherBooksByAuthor
    (prisma.$queryRaw as any).mockResolvedValue([]);
    (prisma.collection.findMany as any).mockResolvedValue([]);
    (prisma.celebrity.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.count as any).mockResolvedValue(0);

    const page = await getBookPageData("voyna-i-mir");

    const [, otherArgs] = (prisma.book.findMany as any).mock.calls;
    expect(otherArgs[0].where.authorId).toBe(10);
    expect(otherArgs[0].where.id.not).toBe(1);
    expect(otherArgs[0].where.status).toBe("published");
    expect(otherArgs[0].take).toBe(4);
    expect(page!.otherBooksByAuthor).toHaveLength(1);
  });

  it("без authorId другие книги автора не запрашиваются", async () => {
    const noAuthor = { ...publishedBook, authorId: null };
    (prisma.book.findUnique as any).mockResolvedValue(noAuthor);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);
    (prisma.collection.findMany as any).mockResolvedValue([]);
    (prisma.celebrity.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.count as any).mockResolvedValue(0);

    const page = await getBookPageData("voyna-i-mir");

    expect((prisma.book.findMany as any).mock.calls).toHaveLength(1); // только similarBooks
    expect(page!.otherBooksByAuthor).toEqual([]);
  });

  it("comments: 10 первых, total из count, автор с username/avatarUrl", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);
    (prisma.collection.findMany as any).mockResolvedValue([]);
    (prisma.celebrity.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.findMany as any).mockResolvedValue([
      { id: 1, content: "Отлично", likesCount: 3, editedAt: null, createdAt: new Date(), user: { id: 4, username: "vasya", avatarUrl: "/a.png" } },
    ]);
    (prisma.bookComment.count as any).mockResolvedValue(42);

    const page = await getBookPageData("voyna-i-mir");

    expect((prisma.bookComment.findMany as any).mock.calls[0][0].take).toBe(10);
    expect(page!.comments.items[0].user.username).toBe("vasya");
    expect(page!.comments.total).toBe(42);
  });

  it("userLike: true когда лайк есть, false для гостя без запроса к БД", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);
    (prisma.collection.findMany as any).mockResolvedValue([]);
    (prisma.celebrity.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.count as any).mockResolvedValue(0);

    // Авторизованный пользователь с лайком
    (prisma.bookLike.findUnique as any).mockResolvedValue({ id: 99 });
    const liked = await getBookPageData("voyna-i-mir", 7);
    expect(liked!.userLike).toBe(true);
    expect((prisma.bookLike.findUnique as any).mock.calls[0][0].where.bookId_userId).toEqual({ bookId: 1, userId: 7 });

    // Гость — запроса к БД нет
    (prisma.bookLike.findUnique as any).mockClear();
    const guest = await getBookPageData("voyna-i-mir");
    expect(guest!.userLike).toBe(false);
    expect(prisma.bookLike.findUnique).not.toHaveBeenCalled();
  });
});