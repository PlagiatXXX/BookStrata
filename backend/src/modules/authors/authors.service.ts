// backend/src/modules/authors/authors.service.ts
import { ValidationError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { slugify } from "../../utils/slugify.js";
import type { PrismaClient } from "@prisma/client";

const logger = createLogger("Authors", { color: "cyan" });

export interface AuthorResult {
  id: number;
  name: string;
  slug: string | null;
  bookCount: number;
}

/** Минимум оценок книги для попадания в топ/худшие на странице автора */
export const MIN_RATINGS = 5;

export interface AuthorBookDto {
  id: number;
  title: string;
  slug: string | null;
  coverImageUrl: string;
  publishedYear: number | null;
  genre: string | null;
  rating: number | null;
  ratingsCount: number;
}

export interface AuthorPageData {
  author: {
    id: number;
    name: string;
    slug: string;
    seoDescription: string;
    bookCount: number;
    avgRating: number | null;
  };
  books: AuthorBookDto[];
  topBooks: AuthorBookDto[];
  bottomBooks: AuthorBookDto[];
  tierLists: { id: string; slug: string | null; title: string }[];
}

/**
 * Эвристика: похоже ли имя на название книги, а не на автора.
 */
export function looksLikeBookTitle(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  // Кавычки-ёлочки — почти всегда книжное название
  if (/[«»]/.test(trimmed)) return true;
  // Слишком длинное — не автор (максимум ~100 символов на длинное имя)
  if (trimmed.length > 100) return true;
  // Содержит перенос строки
  if (/\n/.test(trimmed)) return true;
  return false;
}

export function createAuthorService(prisma: PrismaClient) {
  /**
   * Найти автора по точному совпадению имени (case-insensitive)
   */
  const findByName = async (name: string): Promise<AuthorResult | null> => {
    const author = await prisma.author.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
      },
      include: {
        _count: { select: { books: true } },
      },
    });

    if (!author) return null;

    return {
      id: author.id,
      name: author.name,
      slug: author.slug,
      bookCount: author._count.books,
    };
  };

  /**
   * Найти или создать автора.
   * Если автор с таким именем уже существует (case-insensitive) — возвращаем его.
   * Если нет — создаём нового с транслитерированным slug.
   */
  const findOrCreate = async (name: string): Promise<AuthorResult> => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ValidationError("Author name cannot be empty");
    }

    // Пробуем найти существующего
    const existing = await findByName(trimmed);
    if (existing) {
      logger.debug(`Found existing author: "${trimmed}" (id=${existing.id})`);
      return existing;
    }

    // Создаём нового
    const baseSlug = slugify(trimmed);

    // Проверяем уникальность slug
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.author.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const author = await prisma.author.create({
      data: {
        name: trimmed,
        slug,
      },
    });

    logger.info(`Created new author: "${trimmed}" (slug=${slug}, id=${author.id})`);

    return {
      id: author.id,
      name: author.name,
      slug: author.slug,
      bookCount: 0,
    };
  };

  /**
   * Найти или создать несколько авторов за один batch-запрос.
   * Для уже существующих — один findMany, для остальных — создание по одному.
   * Возвращает Map<оригинальное_имя, AuthorResult>.
   */
  const findOrCreateMany = async (names: string[]): Promise<Map<string, AuthorResult>> => {
    const uniqueNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
    if (uniqueNames.length === 0) return new Map();

    // Загружаем существующих авторов (без insensitive mode в in-условии)
    const existing = await prisma.author.findMany({
      where: { name: { in: uniqueNames } },
      include: { _count: { select: { books: true } } },
    });

    // Строим lookup: lowercase → AuthorResult (существующие)
    const existingMap = new Map<string, AuthorResult>();
    for (const author of existing) {
      existingMap.set(author.name.toLowerCase(), {
        id: author.id,
        name: author.name,
        slug: author.slug,
        bookCount: author._count?.books ?? 0,
      });
    }

    const result = new Map<string, AuthorResult>();

    for (const name of uniqueNames) {
      const found = existingMap.get(name.toLowerCase());
      if (found) {
        result.set(name, found);
      } else {
        // Создаём по одному — обычно их 0–3
        const created = await findOrCreate(name);
        result.set(name, created);
      }
    }

    return result;
  };

  /**
   * Поиск авторов по подстроке (для автодополнения)
   */
  const search = async (query: string, limit = 10): Promise<AuthorResult[]> => {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const authors = await prisma.author.findMany({
      where: {
        name: { contains: query.trim(), mode: "insensitive" },
      },
      include: {
        _count: { select: { books: true } },
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return authors
      .filter((a) => !looksLikeBookTitle(a.name))
      .map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        bookCount: a._count.books,
      }));
  };

  /**
   * Данные страницы автора /authors/:slug.
   * Возвращает null, если автор не найден или у него нет seoDescription
   * (страница публикуется только после генерации SEO-описания).
   */
  const getBySlug = async (slug: string): Promise<AuthorPageData | null> => {
    const author = await prisma.author.findUnique({
      where: { slug },
      include: {
        books: {
          where: { status: "published", userId: null },
          include: { _count: { select: { ratings: true } } },
        },
      },
    });

    if (!author || !author.seoDescription) return null;

    const books: AuthorBookDto[] = author.books
      .map((b) => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        coverImageUrl: b.coverImageUrl,
        publishedYear: b.publishedYear,
        genre: b.genre,
        rating: b.rating,
        ratingsCount: b._count.ratings,
      }))
      .sort((a, b) => {
        // Хронология: null (без года) — в конец
        const ay = a.publishedYear ?? Number.POSITIVE_INFINITY;
        const by = b.publishedYear ?? Number.POSITIVE_INFINITY;
        if (ay !== by) return ay - by;
        return a.title.localeCompare(b.title, "ru");
      });

    const ratedValues = books
      .map((b) => b.rating)
      .filter((r): r is number => r !== null);
    const avgRating = ratedValues.length
      ? Math.round((ratedValues.reduce((s, r) => s + r, 0) / ratedValues.length) * 10) / 10
      : null;

    const rated = books.filter((b) => b.rating !== null && b.ratingsCount >= MIN_RATINGS);
    const topBooks = [...rated]
      .sort((a, b) => (b.rating as number) - (a.rating as number))
      .slice(0, 5);
    const bottomBooks = [...rated]
      .sort((a, b) => (a.rating as number) - (b.rating as number))
      .slice(0, 5);

    const placements = await prisma.bookPlacement.findMany({
      where: {
        book: { authorId: author.id, userId: null, status: "published" },
        tierList: { isPublic: true },
      },
      select: {
        tierListId: true,
        tierList: { select: { id: true, slug: true, title: true } },
      },
      distinct: ["tierListId"],
      orderBy: { tierListId: "asc" },
      take: 6,
    });
    const tierLists = placements.map((p) => p.tierList);

    return {
      author: {
        id: author.id,
        name: author.name,
        // findUnique по slug → slug не null (TS не выводит)
        slug: author.slug as string,
        seoDescription: author.seoDescription,
        bookCount: books.length,
        avgRating,
      },
      books,
      topBooks,
      bottomBooks,
      tierLists,
    };
  };

  return {
    findByName,
    findOrCreate,
    findOrCreateMany,
    search,
    getBySlug,
  };
}

export type AuthorService = ReturnType<typeof createAuthorService>;
