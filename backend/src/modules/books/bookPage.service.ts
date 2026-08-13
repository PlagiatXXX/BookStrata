// backend/src/modules/books/bookPage.service.ts
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

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
    description: string | null;
    genre: string | null;
    tags: string[];
    status: string;
    rating: number | null;
    likesCount: number;
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
 * Все связанные выборки — параллельно (Promise.all), без N+1.
 */
export async function getBookPageData(
  slug: string,
  userId?: number,
): Promise<BookPageData | null> {
  const book = await prisma.book.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      author: true,
      authorId: true,
      coverImageUrl: true,
      description: true,
      genre: true,
      tags: true,
      status: true,
      rating: true,
      likesCount: true,
      contextChain: true,
      authorRel: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!book || book.status !== "published") {
    return null;
  }

  const { id, authorId, genre, tags } = book;

  // Похожие: тот же жанр или пересечение тегов (если нет ни одного — пусто)
  const similarWhere: Prisma.BookWhereInput = {
    status: "published",
    id: { not: id },
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
    prisma.tierList.findMany({
      where: { placements: { some: { bookId: id } }, isPublic: true },
      select: { id: true, slug: true, title: true, isPublic: true },
      orderBy: { likesCount: "desc" },
    }),
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
      description: book.description,
      genre: book.genre,
      tags: book.tags,
      status: book.status,
      rating: book.rating,
      likesCount: book.likesCount,
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