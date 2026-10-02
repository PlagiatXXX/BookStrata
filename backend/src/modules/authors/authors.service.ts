// backend/src/modules/authors/authors.service.ts
import { ValidationError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { slugify } from "../../utils/slugify.js";
import type { PrismaClient } from "@prisma/client";
import type { AuthorBookDto, AuthorPageData } from "./authors.schema.js";

const logger = createLogger("Authors", { color: "cyan" });

export interface AuthorResult {
  id: number;
  name: string;
  slug: string | null;
  bookCount: number;
}

/** Минимум оценок книги для попадания в топ/худшие на странице автора */
export const MIN_RATINGS = 5;

/** Максимум авто-фактов об экранизациях (из лонгридов книг) на странице автора */
export const MAX_FILM_FACTS = 8;

export type { AuthorBookDto, AuthorPageData };

type AuthorAdaptation = AuthorPageData["adaptations"][number];

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

type BookWithCount = {
  id: number; title: string; slug: string | null; coverImageUrl: string;
  publishedYear: number | null; genre: string | null; rating: number | null;
  isbn: string | null; description: string | null;
  _count: { ratings: number };
};

function toBookDto(b: BookWithCount): AuthorBookDto {
  return {
    id: b.id, title: b.title, slug: b.slug, coverImageUrl: b.coverImageUrl,
    publishedYear: b.publishedYear, genre: b.genre, rating: b.rating,
    ratingsCount: b._count.ratings, isbn: b.isbn, description: b.description,
  };
}

/** Блок лонгрида «Погружение в контекст»: { icon, title, text } */
type ContextChainBlock = { icon?: unknown; title?: unknown; text?: unknown };

/** Валидный блок contextChain с фактом об экранизации */
type FilmFactBlock = { icon: string; title: string; text: string };

function isFilmFactBlock(value: unknown): value is FilmFactBlock {
  if (!value || typeof value !== "object") return false;
  const block = value as ContextChainBlock;
  return (
    block.icon === "movie" &&
    typeof block.title === "string" &&
    block.title.trim() !== "" &&
    typeof block.text === "string" &&
    block.text.trim() !== ""
  );
}

/**
 * Собирает факты об экранизациях из лонгридов (contextChain) книг автора.
 * Порядок: новые книги первыми (null-год в конец), внутри книги — порядок блоков.
 * Битые элементы JSON пропускаются, страница не падает.
 */
function collectFilmFacts(
  books: Array<{ title: string; slug: string | null; publishedYear: number | null; contextChain: unknown }>,
): AuthorAdaptation[] {
  const ordered = [...books].sort(
    (a, b) => (b.publishedYear ?? Number.NEGATIVE_INFINITY) - (a.publishedYear ?? Number.NEGATIVE_INFINITY),
  );

  const facts: AuthorAdaptation[] = [];
  for (const book of ordered) {
    if (!Array.isArray(book.contextChain)) continue;
    for (const block of book.contextChain) {
      if (!isFilmFactBlock(block)) continue;
      facts.push({
        kind: "film",
        title: block.title.trim(),
        description: block.text,
        meta: book.title,
        url: book.slug ? `/books/${book.slug}` : null,
      });
      if (facts.length >= MAX_FILM_FACTS) return facts;
    }
  }
  return facts;
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
   * Возвращает null, только если автор не найден.
   * seoDescription опционален (пустая строка, если не заполнен) —
   * страница публикуется по ручному контенту, а не по SEO-полю.
   */
  const getBySlug = async (slug: string): Promise<AuthorPageData | null> => {
    const author = await prisma.author.findUnique({
      where: { slug },
      include: {
        books: {
          where: { status: "published", userId: null },
          include: { _count: { select: { ratings: true } } },
        },
        stats: { orderBy: { order: "asc" as const } },
        showcase: {
          orderBy: { order: "asc" as const },
          include: { book: { include: { _count: { select: { ratings: true } } } } },
        },
        adaptations: { orderBy: { order: "asc" as const } },
        pressQuotes: { orderBy: { order: "asc" as const } },
      },
    });

    if (!author) return null;

    const books: AuthorBookDto[] = author.books
      .map(toBookDto)
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
        seoDescription: author.seoDescription ?? "",
        bookCount: books.length,
        avgRating,
        heroImageUrl: author.heroImageUrl ?? null,
        badge: author.badge ?? null,
        motto: author.motto ?? null,
        manifestoQuote: author.manifestoQuote ?? null,
        manifestoAuthor: author.manifestoAuthor ?? null,
        manifestoRole: author.manifestoRole ?? null,
        aboutText: author.aboutText ?? null,
      },
      books,
      topBooks,
      bottomBooks,
      tierLists,
      stats: (author.stats ?? []).map((s) => ({ value: s.value, label: s.label })),
      showcase: (author.showcase ?? []).map((s) => ({
        book: toBookDto(s.book),
        pullQuote: s.pullQuote,
      })),
      adaptations: [
        ...(author.adaptations ?? []).map((a) => ({
          kind: a.kind, title: a.title, meta: a.meta, description: a.description, url: a.url,
        })),
        // Авто-факты об экранизациях из лонгридов книг — после ручных
        ...collectFilmFacts(author.books),
      ],
      pressQuotes: (author.pressQuotes ?? []).map((q) => ({
        quote: q.quote, source: q.source, sourceRole: q.sourceRole,
      })),
    };
  };

  /**
   * Список всех авторов для страницы «Все авторы» /authors.
   * Только авторы с опубликованными каталоговыми книгами (как на странице
   * автора), мусорные записи (названия книг) отфильтровываются, по алфавиту.
   */
  const list = async (opts?: {
    sort?: "name" | "popular";
    limit?: number;
  }): Promise<AuthorResult[]> => {
    const authors = await prisma.author.findMany({
      where: {
        books: { some: { status: "published", userId: null } },
      },
      include: {
        _count: {
          select: { books: { where: { status: "published", userId: null } } },
        },
      },
      orderBy: { name: "asc" },
    });

    let result = authors
      .filter((a) => a._count.books > 0 && !looksLikeBookTitle(a.name))
      .map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        bookCount: a._count.books,
      }));

    if (opts?.sort === "popular") {
      result = [...result].sort(
        (a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name, "ru"),
      );
    }
    if (opts?.limit) {
      result = result.slice(0, opts.limit);
    }
    return result;
  };

  return {
    findByName,
    findOrCreate,
    findOrCreateMany,
    search,
    list,
    getBySlug,
  };
}

export type AuthorService = ReturnType<typeof createAuthorService>;
