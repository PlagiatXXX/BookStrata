// backend/src/modules/books/bookPage.service.ts
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { normTitleForSql } from "../tier-lists/tierList.books.service.js";

/** Компактная выборка книги для карточек (similarBooks / otherBooksByAuthor) */
const bookCardSelect = {
  id: true,
  slug: true,
  title: true,
  author: true,
  coverImageUrl: true,
  genre: true,
  tags: true,
  rating: true,
  publishedYear: true,
} satisfies Prisma.BookSelect;

export interface BookPageComment {
  id: number;
  content: string;
  likesCount: number;
  editedAt: Date | null;
  createdAt: Date;
  user: { id: number; username: string; avatarUrl: string | null };
}

export interface BookPageData {
  book: {
    id: number;
    slug: string | null;
    title: string;
    author: string | null;
    coverImageUrl: string;
    ogImageUrl: string | null;
    description: string | null;
    genre: string | null;
    tags: string[];
    status: string;
    rating: number | null;
    likesCount: number;
    publishedYear: number | null;
    isbn: string | null;
    contextChain: unknown;
  };
  author: { id: number; name: string; slug: string | null } | null;
  tierLists: { id: string; slug: string | null; title: string; isPublic: boolean }[];
  collections: { id: number; slug: string; title: string; type: string }[];
  celebrities: { id: number; slug: string; name: string }[];
  similarBooks: unknown[];
  otherBooksByAuthor: unknown[];
  comments: { items: BookPageComment[]; total: number };
  userLike: boolean;
}

/**
 * Публичные данные страницы книги (GET /api/books/:slug).
 * Возвращает null, если книга не найдена или не опубликована → 404.
 * Возвращает { redirectTo }, если slug устарел (slugHistory) или книга
 * поглощена каноном (mergedIntoId) → роутер отдаёт 301 на актуальный URL.
 * Все связанные выборки — параллельно (Promise.all), без N+1.
 */
export async function getBookPageData(
  slug: string,
  userId?: number,
): Promise<BookPageData | { redirectTo: string } | null> {
  const book = await prisma.book.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      author: true,
      authorId: true,
      coverImageUrl: true,
      ogImageUrl: true,
      description: true,
      genre: true,
      tags: true,
      status: true,
      rating: true,
      likesCount: true,
      publishedYear: true,
      isbn: true,
      contextChain: true,
      mergedIntoId: true,
      authorRel: { select: { id: true, name: true, slug: true } },
    },
  });

  // Slug из истории (смена slug у published-книги) → 301 на актуальный URL
  if (!book) {
    const history = await prisma.bookSlugHistory.findUnique({
      where: { oldSlug: slug },
      select: { bookId: true },
    });
    if (history) {
      const canon = await prisma.book.findUnique({
        where: { id: history.bookId },
        select: { slug: true, status: true },
      });
      if (canon?.slug && canon.slug !== slug && canon.status === "published") {
        return { redirectTo: `/books/${canon.slug}` };
      }
    }
    return null;
  }

  // Поглощённая книга (дедуп/склейка) → 301 на канон, если он опубликован
  if (book.mergedIntoId) {
    const canon = await prisma.book.findUnique({
      where: { id: book.mergedIntoId },
      select: { slug: true, status: true },
    });
    if (canon?.slug && canon.status === "published") {
      return { redirectTo: `/books/${canon.slug}` };
    }
    return null;
  }

  if (book.status !== "published") {
    return null;
  }

  const { id, authorId, genre, tags } = book;

  // Похожие: тот же жанр или пересечение тегов (если нет ни одного — пусто).
  // Книги автора исключаются — они уже показаны в «Другие книги автора»,
  // чтобы разделы не пересекались (вариативность для пользователя).
  const similarWhere: Prisma.BookWhereInput = {
    status: "published",
    id: { not: id },
    ...(authorId ? { authorId: { not: authorId } } : {}),
  };
  if (genre || tags.length > 0) {
    similarWhere.OR = [
      ...(genre ? [{ genre }] : []),
      ...(tags.length > 0 ? [{ tags: { hasSome: tags } }] : []),
    ];
  }

  const [
    tierLists,
    collections,
    celebrities,
    similarBooks,
    otherBooksByAuthor,
    comments,
    commentsTotal,
    userLike,
  ] = await Promise.all([
    // Тир-листы матчатся по НОРМАЛИЗОВАННЫМ (title, author), а не по bookId
    // (решение 17.08): в тир-листах книги пользовательские (draft-копии),
    // каталог с ними не склеивается — страница книги находит тир-листы,
    // где такая книга есть, по названию и автору.
    prisma.$queryRaw<Array<{ id: string; slug: string | null; title: string; isPublic: boolean; likesCount: number }>>`
      SELECT DISTINCT tl.id, tl.slug, tl.title, tl.is_public, tl.likes_count
      FROM tier_lists tl
      JOIN "BookPlacement" bp ON bp."tierListId" = tl.id
      JOIN "Book" b ON b.id = bp."bookId"
      WHERE tl.is_public = true
        AND lower(trim(regexp_replace(translate(b.title, 'Ёё', 'Ее'), '\s+', ' ', 'g'))) = ${normTitleForSql(book.title)}
        AND (${book.author ? normTitleForSql(book.author) : null}::text IS NULL
             OR (b.author IS NOT NULL AND lower(trim(regexp_replace(translate(b.author, 'Ёё', 'Ее'), '\s+', ' ', 'g'))) = ${book.author ? normTitleForSql(book.author) : null}))
      ORDER BY tl.likes_count DESC
    `,
    prisma.collection.findMany({
      where: { catalogBooks: { some: { bookId: id } }, isPublished: true },
      select: { id: true, slug: true, title: true, type: true },
      orderBy: { order: "asc" },
    }),
    prisma.celebrity.findMany({
      where: { catalogBooks: { some: { bookId: id } }, isPublished: true },
      select: { id: true, slug: true, name: true },
      orderBy: { order: "asc" },
    }),
    prisma.book.findMany({
      where: similarWhere,
      select: bookCardSelect,
      orderBy: [{ likesCount: "desc" }, { publishedAt: "desc" }],
      take: 8,
    }),
    authorId
      ? prisma.book.findMany({
          where: { authorId, status: "published", id: { not: id } },
          select: bookCardSelect,
          orderBy: [{ placements: { _count: "desc" } }, { publishedAt: "desc" }],
          take: 4,
        })
      : Promise.resolve([]),
    prisma.bookComment.findMany({
      where: { bookId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        content: true,
        likesCount: true,
        editedAt: true,
        createdAt: true,
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    }),
    prisma.bookComment.count({ where: { bookId: id } }),
    userId
      ? prisma.bookLike.findUnique({
          where: { bookId_userId: { bookId: id, userId } },
        })
      : Promise.resolve(null),
  ]);

  return {
    book: {
      id: book.id,
      slug: book.slug,
      title: book.title,
      author: book.author,
      coverImageUrl: book.coverImageUrl,
      ogImageUrl: book.ogImageUrl,
      description: book.description,
      genre: book.genre,
      tags: book.tags,
      status: book.status,
      rating: book.rating,
      likesCount: book.likesCount,
      publishedYear: book.publishedYear,
      isbn: book.isbn,
      contextChain: book.contextChain,
    },
    author: book.authorRel,
    tierLists,
    collections,
    celebrities,
    similarBooks,
    otherBooksByAuthor,
    comments: { items: comments, total: commentsTotal },
    userLike: Boolean(userLike),
  };
}