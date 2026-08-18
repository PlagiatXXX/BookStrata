// backend/src/modules/admin-books/admin-books.service.ts
// Админка каталога книг (Фаза 7, seobook.md): листинг с фильтрами,
// правка полей + slug с историей (BookSlugHistory → 301), публикация
// только через publishBook() (инвариант полноты), ручной merge дублей,
// обогащение из Google Books, топ по просмотрам, модерация комментариев.
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { excludedUserFilter } from "../analytics/analytics.service.js";
import { publishBook, unpublishBook } from "../books/bookPublish.service.js";
import { searchBooks } from "../books/books.service.js";
import {
  mergeGroup,
  type DedupeBook,
} from "../books/bookDedupe.service.js";
import { createAuthorService } from "../authors/authors.service.js";
import { deleteIfOrphaned } from "../../lib/storage/file-cleanup.js";
import { ValidationError } from "../../lib/errors.js";
import { validateRemoteImageDimensions } from "../../lib/validators.js";

const authorService = createAuthorService(prisma);

const MAX_COMMENT_LENGTH = 2000;

export interface BookListParams {
  q?: string;
  status?: string;
  genre?: string;
  duplicatesOnly?: boolean;
  /** Происхождение книги: "tier-list" — есть вхождения в тир-листы пользователей,
   *  "catalog" — тир-листов нет (каталог/коллекции/знаменитости). */
  origin?: "tier-list" | "catalog";
  sort?: string;
  offset?: number;
  limit?: number;
}

const BOOK_LIST_SELECT = {
  id: true,
  title: true,
  author: true,
  slug: true,
  status: true,
  genre: true,
  tags: true,
  coverImageUrl: true,
  rating: true,
  likesCount: true,
  publishedAt: true,
  updatedAt: true,
  mergedIntoId: true,
  source: true,
  externalId: true,
  _count: { select: { comments: true, placements: true } },
} satisfies Prisma.BookSelect;

/** Строка результата $queryRaw в searchBooksByRelevance. */
interface BookSearchRow {
  id: number;
  title: string;
  author: string | null;
  slug: string | null;
  status: string;
  genre: string | null;
  tags: string[];
  cover_image_url: string;
  rating: number | null;
  likesCount: number;
  publishedAt: Date | null;
  updatedAt: Date;
  mergedIntoId: number | null;
  source: string | null;
  externalId: string | null;
  comments: number;
  placements: number;
}

/** Сворачивает группы AnalyticsEvent в map slug → просмотры.
 *  url бывает полным href (https://bookstrata.ru/books/x) и путём (/books/x). */
function collectViewsBySlug(groups: Array<{ url: string | null; _count: { url: number } }>) {
  const viewsBySlug = new Map<string, number>();
  for (const g of groups) {
    const slug = g.url?.split("/books/")[1]?.split("/")[0];
    if (slug && /^[a-z0-9-]+$/.test(slug)) {
      viewsBySlug.set(slug, (viewsBySlug.get(slug) ?? 0) + g._count.url);
    }
  }
  return viewsBySlug;
}

/** Поиск по названию/автору с релевантной сортировкой: точное совпадение →
 *  начало названия → начало автора → подстрока. Без неё при LIMIT 50 книга
 *  по подстроке «тонет» в выдаче, отсортированной по updatedAt desc, и
 *  создаётся впечатление, что поиск не находит (помогает только полное имя). */
async function searchBooksByRelevance(params: BookListParams) {
  const q = params.q!.trim().toLowerCase();
  const limit = Math.min(params.limit ?? 50, 200);
  const offset = params.offset ?? 0;

  const where: Prisma.BookWhereInput = {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { author: { contains: q, mode: "insensitive" } },
    ],
  };
  if (params.status) where.status = params.status as Prisma.BookWhereInput["status"];
  if (params.genre) where.genre = params.genre;
  if (params.duplicatesOnly) where.mergedIntoId = { not: null };
  // «Из тир-листов»: личные книги (userId) + легаси-общие, у которых есть вхождения
  if (params.origin === "tier-list") {
    (where.OR as Prisma.BookWhereInput[]).push(
      { userId: { not: null } },
      { placements: { some: {} } },
    );
  }
  if (params.origin === "catalog") {
    where.placements = { none: {} };
    where.userId = null;
  }

  const [total, rows] = await Promise.all([
    prisma.book.count({ where }),
    prisma.$queryRaw<BookSearchRow[]>(Prisma.sql`
      SELECT b.id, b.title, b.author, b.slug, b.status, b.genre, b.tags,
             b.cover_image_url, b.rating, b."likesCount", b."publishedAt",
             b."updated_at", b."mergedIntoId", b.source, b."externalId",
             (SELECT COUNT(*)::int FROM "book_comments" c WHERE c."bookId" = b.id) AS comments,
             (SELECT COUNT(*)::int FROM "BookPlacement" p WHERE p."bookId" = b.id) AS placements
      FROM "Book" b
      WHERE (lower(b.title) LIKE ${`%${q}%`} OR lower(coalesce(b.author, '')) LIKE ${`%${q}%`})
        ${params.status ? Prisma.sql`AND b.status::text = ${params.status}` : Prisma.empty}
        ${params.genre ? Prisma.sql`AND b.genre = ${params.genre}` : Prisma.empty}
        ${params.duplicatesOnly ? Prisma.sql`AND b."mergedIntoId" IS NOT NULL` : Prisma.empty}
        ${params.origin === "tier-list" ? Prisma.sql`AND (b.user_id IS NOT NULL OR EXISTS (SELECT 1 FROM "BookPlacement" p2 WHERE p2."bookId" = b.id))` : Prisma.empty}
        ${params.origin === "catalog" ? Prisma.sql`AND NOT EXISTS (SELECT 1 FROM "BookPlacement" p3 WHERE p3."bookId" = b.id) AND b.user_id IS NULL` : Prisma.empty}
      ORDER BY CASE
          WHEN lower(b.title) = ${q} THEN 0
          WHEN lower(b.title) LIKE ${`${q}%`} THEN 1
          WHEN lower(coalesce(b.author, '')) LIKE ${`${q}%`} THEN 2
          ELSE 3
        END, b.title ASC
      LIMIT ${limit} OFFSET ${offset}
    `),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      author: r.author,
      slug: r.slug,
      status: r.status,
      genre: r.genre,
      tags: r.tags,
      coverImageUrl: r.cover_image_url,
      rating: r.rating,
      likesCount: r.likesCount,
      publishedAt: r.publishedAt,
      updatedAt: r.updatedAt,
      mergedIntoId: r.mergedIntoId,
      source: r.source,
      externalId: r.externalId,
      _count: { comments: r.comments, placements: r.placements },
    })),
    total,
  };
}

export async function listBooks(params: BookListParams) {
  const searchResult = params.q?.trim() ? await searchBooksByRelevance(params) : null;

  const where: Prisma.BookWhereInput = {};
  const orFilters: Prisma.BookWhereInput[] = [];
  if (params.q) {
    orFilters.push(
      { title: { contains: params.q, mode: "insensitive" } },
      { author: { contains: params.q, mode: "insensitive" } },
    );
  }
  if (params.status) where.status = params.status as Prisma.BookWhereInput["status"];
  if (params.genre) where.genre = params.genre;
  if (params.duplicatesOnly) where.mergedIntoId = { not: null };
  // «Из тир-листов»: личные книги (userId) + легаси-общие, у которых есть вхождения
  if (params.origin === "tier-list") {
    orFilters.push({ userId: { not: null } }, { placements: { some: {} } });
  }
  if (params.origin === "catalog") {
    where.placements = { none: {} };
    where.userId = null;
  }
  if (orFilters.length > 0) where.OR = orFilters;

  const sort = params.sort ?? "updatedAt";
  const orderBy: Prisma.BookOrderByWithRelationInput =
    sort === "rating"
      ? { rating: "desc" }
      : sort === "likesCount"
        ? { likesCount: "desc" }
        : sort === "title"
          ? { title: "asc" }
          : { updatedAt: "desc" };

  // Просмотры считаем одной агрегацией по всем /books/ и привязываем по slug
  const [items, total, viewGroups] = searchResult
    ? [
        searchResult.items,
        searchResult.total,
        await prisma.analyticsEvent.groupBy({
          by: ["url"],
          where: {
            event: "page_view",
            url: { contains: "/books/" },
            ...excludedUserFilter,
          },
          _count: { url: true },
        }),
      ]
    : await Promise.all([
        prisma.book.findMany({
          where,
          orderBy,
          skip: params.offset ?? 0,
          take: Math.min(params.limit ?? 50, 200),
          select: BOOK_LIST_SELECT,
        }),
        prisma.book.count({ where }),
        prisma.analyticsEvent.groupBy({
          by: ["url"],
          where: {
            event: "page_view",
            url: { contains: "/books/" },
            ...excludedUserFilter,
          },
          _count: { url: true },
        }),
      ]);

  const viewsBySlug = collectViewsBySlug(viewGroups);

  return {
    items: items.map((book) => ({ ...book, views: viewsBySlug.get(book.slug ?? "") ?? 0 })),
    total,
  };
}

/** Полная книга для редактора (contextChain, история slug). */
export async function getBookAdmin(id: number) {
  return prisma.book.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      author: true,
      authorId: true,
      slug: true,
      status: true,
      genre: true,
      tags: true,
      description: true,
      coverImageUrl: true,
      publishedYear: true,
      isbn: true,
      rating: true,
      likesCount: true,
      contextChain: true,
      source: true,
      externalId: true,
      mergedIntoId: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      slugHistory: { select: { id: true, oldSlug: true, createdAt: true } },
      authorRel: { select: { name: true } },
    },
  });
}

export interface BookUpdateInput {
  title?: string;
  author?: string | null;
  description?: string | null;
  genre?: string | null;
  tags?: string[];
  coverImageUrl?: string;
  publishedYear?: number | null;
  slug?: string;
  contextChain?: Array<{ icon: string; title: string; text: string }> | null;
}

export class AdminBookError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "AdminBookError";
  }
}

/**
 * Правка полей книги + slug. Смена slug у published-книги пишет старый
 * slug в BookSlugHistory — старый URL отдаёт 301 (Фаза 6), а не 404.
 */
export async function updateBookAdmin(id: number, data: BookUpdateInput) {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw new AdminBookError("Книга не найдена", "book_not_found");

  const updateData: Prisma.BookUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) {
    updateData.description = data.description?.trim() || null;
  }
  if (data.genre !== undefined) updateData.genre = data.genre?.trim() || null;
  if (data.tags !== undefined) {
    updateData.tags = data.tags.map((t) => t.trim()).filter(Boolean);
  }
  if (data.coverImageUrl !== undefined) {
    // Проверяем только при смене URL — старые книги с мелкой обложкой
    // можно редактировать без замены картинки
    if (data.coverImageUrl.trim() !== book.coverImageUrl) {
      const coverError = await validateRemoteImageDimensions(data.coverImageUrl);
      if (coverError) throw new ValidationError(coverError);
    }
    updateData.coverImageUrl = data.coverImageUrl.trim();
  }
  if (data.publishedYear !== undefined) updateData.publishedYear = data.publishedYear;

  if (data.author !== undefined) {
    if (data.author?.trim()) {
      const author = await authorService.findOrCreate(data.author.trim());
      updateData.authorRel = { connect: { id: author.id } };
      updateData.author = data.author.trim();
    } else {
      updateData.authorRel = { disconnect: true };
      updateData.author = null;
    }
  }
  if (data.contextChain !== undefined) {
    updateData.contextChain = data.contextChain && data.contextChain.length > 0
      ? (data.contextChain as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }

  // Смена slug: уникальность + история для published
  if (data.slug !== undefined && data.slug.trim() !== book.slug) {
    const newSlug = data.slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(newSlug)) {
      throw new AdminBookError(
        "Slug может содержать только латиницу, цифры и дефисы",
        "invalid_slug",
      );
    }
    const existing = await prisma.book.findUnique({ where: { slug: newSlug } });
    if (existing && existing.id !== id) {
      throw new AdminBookError("Книга с таким slug уже существует", "slug_exists");
    }
    if (book.status === "published" && book.slug) {
      await prisma.bookSlugHistory.create({
        data: { oldSlug: book.slug, bookId: id },
      });
    }
    updateData.slug = newSlug;
  }

  const oldCover = book.coverImageUrl;

  const updated = await prisma.book.update({ where: { id }, data: updateData });

  // Старый файл обложки (наш S3/CDN/локальный) осиротел — чистим,
  // если на него никто больше не ссылается
  if (oldCover && oldCover !== updated.coverImageUrl) {
    await deleteIfOrphaned(oldCover);
  }

  return updated;
}

/** Публикация только через publishBook() — инвариант полноты полей. */
export async function publishBookById(id: number) {
  // Модель «личные книги» (18.08): книги из тир-листов не попадают в каталог.
  // Публикация пользовательских книг (личных userId или с вхождениями) запрещена.
  const book = await prisma.book.findUnique({
    where: { id },
    select: { userId: true, _count: { select: { placements: true } } },
  });
  if (!book) throw new AdminBookError("Книга не найдена", "book_not_found");
  if (book.userId !== null || book._count.placements > 0) {
    throw new AdminBookError(
      "Книга из тир-листа пользователя — публикация в каталог запрещена",
      "book_from_tier_list",
    );
  }
  return publishBook(id);
}

export async function unpublishBookById(id: number) {
  return unpublishBook(id);
}

/**
 * Обогащение из Google Books: поиск по title+author, заполнение полей.
 * status не трогаем — публикация отдельно, через publishBook().
 */
export async function enrichBookFromGoogle(id: number): Promise<{ updated: string[] }> {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw new AdminBookError("Книга не найдена", "book_not_found");

  const query = [book.title, book.author].filter(Boolean).join(" ");
  const results = await searchBooks(query, 0);
  const best = results.find((r) => r.coverUrl || r.coverUrlLarge);
  if (!best) {
    throw new AdminBookError("Ничего не найдено в Google Books", "google_empty");
  }

  const updateData: Prisma.BookUpdateInput = {};
  const updated: string[] = [];

  if (best.title && best.title !== book.title) {
    updateData.title = best.title;
    updated.push("title");
  }
  if (best.author && best.author !== book.author) {
    const author = await authorService.findOrCreate(best.author);
    updateData.authorRel = { connect: { id: author.id } };
    updateData.author = best.author;
    updated.push("author");
  }
  const cover = best.coverUrlLarge || best.coverUrl;
  if (cover && cover !== book.coverImageUrl) {
    updateData.coverImageUrl = cover;
    updated.push("coverImageUrl");
  }
  if (best.publishYear && best.publishYear !== book.publishedYear) {
    updateData.publishedYear = best.publishYear;
    updated.push("publishedYear");
  }
  if (best.subjects?.length && !book.genre) {
    updateData.genre = best.subjects[0];
    updated.push("genre");
  }

  // description не перезаписываем — редакторский текст может быть лучше.
  if (Object.keys(updateData).length === 0) {
    return { updated: [] };
  }
  await prisma.book.update({ where: { id }, data: updateData });

  // Обложка заменилась на внешнюю (Google Books) — старый файл чистим
  if (updateData.coverImageUrl !== undefined) {
    await deleteIfOrphaned(book.coverImageUrl);
  }
  return { updated };
}

/**
 * Ручной merge дубля в канон: перенос связей (placements/ratings/statuses/
 * collectionBooks/celebrityBooks), mergedIntoId, удаление дубля, если пуст.
 * Переиспользует mergeGroup из авто-дедупа (bookDedupe.service).
 */
export async function mergeBooksByIds(dupId: number, canonId: number) {
  if (dupId === canonId) {
    throw new AdminBookError("Нельзя склеить книгу с самой собой", "invalid_merge");
  }
  const [dup, canon] = await Promise.all([
    prisma.book.findUnique({ where: { id: dupId } }),
    prisma.book.findUnique({ where: { id: canonId } }),
  ]);
  if (!dup || !canon) {
    throw new AdminBookError("Книга не найдена", "book_not_found");
  }
  if (dup.mergedIntoId) {
    throw new AdminBookError("Книга уже поглощена другим каноном", "already_merged");
  }

  // Защита от потери published-страницы: черновик не может поглотить
  // опубликованную книгу (иначе её URL умирает, как в баге со склейкой «Ртути»).
  if (dup.status === "published" && canon.status !== "published") {
    throw new AdminBookError(
      "Нельзя поглотить опубликованную книгу черновиком: сначала опубликуйте книгу-канон",
      "cannot_merge_published_into_draft",
    );
  }

  const fetchDedupeBook = async (b: typeof dup): Promise<DedupeBook> => {
    const withCounts = await prisma.book.findUniqueOrThrow({
      where: { id: b.id },
      select: {
        id: true, title: true, authorId: true, slug: true, coverImageUrl: true,
        description: true, publishedAt: true, status: true, createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            placements: true, ratings: true, statuses: true,
            collectionBooks: true, celebrityBooks: true,
            comments: true, likes: true,
          },
        },
      },
    });
    return {
      id: withCounts.id,
      title: withCounts.title,
      authorId: withCounts.authorId,
      slug: withCounts.slug,
      coverImageUrl: withCounts.coverImageUrl,
      description: withCounts.description,
      publishedAt: withCounts.publishedAt,
      status: withCounts.status,
      createdAt: withCounts.createdAt,
      updatedAt: withCounts.updatedAt,
      placementsCount: withCounts._count.placements,
      ratingsCount: withCounts._count.ratings,
      statusesCount: withCounts._count.statuses,
      collectionBooksCount: withCounts._count.collectionBooks,
      celebrityBooksCount: withCounts._count.celebrityBooks,
      commentsCount: withCounts._count.comments,
      likesCount: withCounts._count.likes,
    };
  };

  const [dupBook, canonBook] = await Promise.all([
    fetchDedupeBook(dup),
    fetchDedupeBook(canon),
  ]);

  // Выбор канона из админки имеет приоритет: mergeGroup не перевыбирает
  // его через pickCanon (баг: склейка «Ртути» поглотила published-книгу
  // черновиком, потому что score черновика оказался выше).
  await mergeGroup(
    {
      key: `manual:${dupId}->${canonId}`,
      books: [canonBook, dupBook],
    },
    { forceCanonId: canonId },
  );

  return prisma.book.findUnique({ where: { id: canonId } });
}

/** Топ книг по просмотрам (AnalyticsEvent page_view с url /books/:slug). */
export async function topBooksByViews(limit = 10) {
  const groups = await prisma.analyticsEvent.groupBy({
    by: ["url"],
    where: {
      event: "page_view",
      // url может быть как полным href (https://bookstrata.ru/books/x),
      // так и путём (/books/x) — ищем вхождение
      url: { contains: "/books/" },
      // Просмотры исключённых пользователей (владелец и т.п.) не считаем
      ...excludedUserFilter,
    },
    _count: { url: true },
    orderBy: { _count: { url: "desc" } },
    // Берём с запасом: разные форматы url одной книги сливаются ниже
    take: 200,
  });

  const viewsBySlug = collectViewsBySlug(groups);

  const topSlugs = [...viewsBySlug.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.min(limit, 50))
    .map(([slug]) => slug);

  if (topSlugs.length === 0) return [];

  const books = await prisma.book.findMany({
    where: { slug: { in: topSlugs } },
    select: BOOK_LIST_SELECT,
  });

  return topSlugs
    .map((slug) => {
      const book = books.find((b) => b.slug === slug);
      return book ? { book, views: viewsBySlug.get(slug) ?? 0 } : null;
    })
    .filter((x): x is { book: (typeof books)[number]; views: number } => x !== null);
}

// ——— Модерация комментариев ———

export async function listBookComments(params: {
  bookId?: number;
  q?: string;
  offset?: number;
  limit?: number;
}) {
  const where: Prisma.BookCommentWhereInput = {};
  if (params.bookId) where.bookId = params.bookId;
  if (params.q) where.content = { contains: params.q, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.bookComment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.offset ?? 0,
      take: Math.min(params.limit ?? 50, 200),
      select: {
        id: true,
        content: true,
        likesCount: true,
        editedAt: true,
        createdAt: true,
        parentId: true,
        book: { select: { id: true, title: true, slug: true } },
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    }),
    prisma.bookComment.count({ where }),
  ]);

  return { items, total };
}

export async function updateCommentAdmin(commentId: number, content: string) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) {
    throw new AdminBookError(
      "Комментарий пуст или длиннее 2000 символов",
      "invalid_comment_content",
    );
  }
  return prisma.bookComment.update({
    where: { id: commentId },
    data: { content: trimmed, editedAt: new Date() },
  });
}

export async function deleteCommentAdmin(commentId: number) {
  return prisma.bookComment.delete({ where: { id: commentId } });
}
