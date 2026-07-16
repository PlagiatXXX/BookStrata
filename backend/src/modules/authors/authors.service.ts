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

  return {
    findByName,
    findOrCreate,
    search,
  };
}

export type AuthorService = ReturnType<typeof createAuthorService>;
