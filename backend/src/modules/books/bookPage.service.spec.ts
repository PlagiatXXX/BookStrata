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
    bookSlugHistory: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "../../lib/prisma.js";
import { getBookPageData, type BookPageData } from "./bookPage.service.js";

/** Сужает объединённый тип (данные | redirect) до данных — для проверок полей. */
function asBookPage(
  page: BookPageData | { redirectTo: string } | null,
): BookPageData {
  if (!page || "redirectTo" in page) {
    throw new Error("expected BookPageData, got redirect");
  }
  return page;
}

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
      { id: "t1", slug: "t-1", title: "Лист", isPublic: true, likesCount: 5 },
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
    expect(asBookPage(page).tierLists).toHaveLength(1);
    expect(asBookPage(page).collections).toHaveLength(1);
    expect(asBookPage(page).celebrities).toHaveLength(1);
    // Фильтры видимости в where
    expect((prisma.collection.findMany as any).mock.calls[0][0].where.isPublished).toBe(true);
    expect((prisma.celebrity.findMany as any).mock.calls[0][0].where.isPublished).toBe(true);
    expect((prisma.collection.findMany as any).mock.calls[0][0].where.catalogBooks.some.bookId).toBe(1);
    // SQL-запрос тир-листов: только публичные + нормализованные title/author книги
    const sqlCall = (prisma.$queryRaw as any).mock.calls[0];
    // Таблица tier_lists и колонки is_public/likes_count (snake_case через @map в Prisma)
    expect(sqlCall[0].join(" ")).toContain("FROM tier_lists tl");
    expect(sqlCall[0].join(" ")).toContain("tl.is_public = true");
    expect(sqlCall[0].join(" ")).toContain("ORDER BY tl.likes_count DESC");
    expect(sqlCall[0].join(" ")).toContain("regexp_replace");
    // Нормализованные значения title/author передаются параметрами
    expect(sqlCall).toContain("война и мир");
    expect(sqlCall).toContain("лев толстой");
  });

  it("similarBooks: AND статуса + OR по жанру/тегам, лимит 8, без книг автора", async () => {
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
    // Книги автора исключаются — они уходят в «Другие книги автора» (разделы не пересекаются)
    expect(similarArgs.where.authorId.not).toBe(10);
    expect(similarArgs.where.OR).toHaveLength(2); // genre + tags
    expect(similarArgs.take).toBe(8);
    expect(asBookPage(page).similarBooks).toHaveLength(1);
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

    // первый findMany — это similarBooks с take 8; OR отсутствует в where,
    // но книги автора всё равно исключаются
    const [similarArgs] = (prisma.book.findMany as any).mock.calls[0];
    expect(similarArgs.where.OR).toBeUndefined();
    expect(similarArgs.where.authorId.not).toBe(10);
    expect(asBookPage(page).similarBooks).toEqual([]);
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
    expect(asBookPage(page).otherBooksByAuthor).toHaveLength(1);
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
    // у similarBooks нет фильтра по автору (автора у книги нет)
    const [similarWhere] = (prisma.book.findMany as any).mock.calls[0];
    expect(similarWhere.authorId).toBeUndefined();
    expect(asBookPage(page).otherBooksByAuthor).toEqual([]);
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
    expect(asBookPage(page).comments.items[0].user.username).toBe("vasya");
    expect(asBookPage(page).comments.total).toBe(42);
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
    expect(asBookPage(liked).userLike).toBe(true);
    expect((prisma.bookLike.findUnique as any).mock.calls[0][0].where.bookId_userId).toEqual({ bookId: 1, userId: 7 });

    // Гость — запроса к БД нет
    (prisma.bookLike.findUnique as any).mockClear();
    const guest = await getBookPageData("voyna-i-mir");
    expect(asBookPage(guest).userLike).toBe(false);
    expect(prisma.bookLike.findUnique).not.toHaveBeenCalled();
  });

  it("slug из slugHistory → { redirectTo } на актуальный URL (301)", async () => {
    // Книги по старому slug нет, в истории — канон с новым slug
    (prisma.book.findUnique as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ slug: "rtut-kelly-hart", status: "published" });
    (prisma.bookSlugHistory.findUnique as any).mockResolvedValue({ bookId: 5 });

    const page = await getBookPageData("rtut-kelli-hart", 1);

    expect(page).toEqual({ redirectTo: "/books/rtut-kelly-hart" });
    expect((prisma.bookSlugHistory.findUnique as any).mock.calls[0][0]).toEqual({
      where: { oldSlug: "rtut-kelli-hart" },
      select: { bookId: true },
    });
  });

  it("slugHistory без опубликованного канона → null (404)", async () => {
    (prisma.book.findUnique as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ slug: "rtut-kelly-hart", status: "draft" });
    (prisma.bookSlugHistory.findUnique as any).mockResolvedValue({ bookId: 5 });

    expect(await getBookPageData("rtut-kelli-hart", 1)).toBeNull();
  });

  it("поглощённая книга (mergedIntoId) → { redirectTo } на канон (301)", async () => {
    // Остаток после склейки: книга найдена по slug, но поглощена каноном
    (prisma.book.findUnique as any)
      .mockResolvedValueOnce({ ...publishedBook, mergedIntoId: 5 })
      .mockResolvedValueOnce({ slug: "rtut-kelly-hart", status: "published" });

    const page = await getBookPageData("rtut-kelli-hart", 1);

    expect(page).toEqual({ redirectTo: "/books/rtut-kelly-hart" });
  });

  it("поглощённая книга без опубликованного канона → null (404)", async () => {
    (prisma.book.findUnique as any)
      .mockResolvedValueOnce({ ...publishedBook, mergedIntoId: 5 })
      .mockResolvedValueOnce({ slug: null, status: "draft" });

    expect(await getBookPageData("rtut-kelli-hart", 1)).toBeNull();
  });
});