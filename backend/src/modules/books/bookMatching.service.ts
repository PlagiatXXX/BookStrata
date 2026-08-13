// backend/src/modules/books/bookMatching.service.ts
// Общий сервис матчинга книг при добавлении (Фаза 2.1, seobook.md).
// Используется тир-листами, коллекциями и знаменитостями.
// Каскад уверенности: externalId → точное совпадение → fuzzy (top-N + автор).
// Сомнение → draft (book = null), не рискуем.
import type { PrismaClient } from "@prisma/client";

export type BookSourceValue = "google_books" | "open_library" | "livelib";

export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW";

/** Срез книги-кандидата, достаточный для матчинга и отображения в админке */
export interface BookCandidate {
  id: number;
  title: string;
  authorId: number | null;
  author: string | null;
  coverImageUrl: string;
  slug: string | null;
  status: string;
  source: string | null;
  externalId: string | null;
  publishedYear: number | null;
  rating: number | null;
}

export interface MatchInput {
  title: string;
  author?: string | null;
  /** Резолвнутый authorId (автор уже найден/создан в Author) — приоритет над строкой */
  authorId?: number | null;
  externalId?: string | null;
  /** Значение enum BookSource (google_books | open_library | livelib) */
  source?: string | null;
}

export interface MatchResult {
  /** Канон для link. null — создать draft (сомнение/не найдено). */
  book: BookCandidate | null;
  confidence: MatchConfidence | null;
  /** Кандидаты (для MEDIUM — «предложить склейку» в админке) */
  candidates: BookCandidate[];
}

const BOOK_SELECT = {
  id: true,
  title: true,
  author: true,
  authorId: true,
  coverImageUrl: true,
  slug: true,
  status: true,
  source: true,
  externalId: true,
  publishedYear: true,
  rating: true,
} as const;

/**
 * Нормализация названия/автора для сравнения: lower, trim, ё→е,
 * схлопывание пробелов, снятие «кавычек»/скобок/тире (решение 12.08).
 * Та же семантика, что в дедупе (bookDedupe.service.ts), расширенная.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/ё/g, "е")
    .replace(/[«»"'(){}—–-]/g, " ")    .replace(/\s+/g, " ")
    .trim();
}

function toCandidate(row: {
  id: number;
  title: string;
  author: string | null;
  authorId: number | null;
  coverImageUrl: string;
  slug: string | null;
  status: string;
  source: string | null;
  externalId: string | null;
  publishedYear: number | null;
  rating: number | null;
}): BookCandidate {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    authorId: row.authorId,
    coverImageUrl: row.coverImageUrl,
    slug: row.slug,
    status: row.status,
    source: row.source,
    externalId: row.externalId,
    publishedYear: row.publishedYear,
    rating: row.rating,
  };
}

const ENTITY = "Book";

/**
 * Каскад уверенности (по seobook.md):
 * 1. externalId+source — самый сильный сигнал;
 * 2. точное совпадение: (normTitle, authorId) → (normTitle, normAuthor)
 *    → безавторные только по normTitle и ровно один кандидат;
 * 3. fuzzy — триграммное сходство (GIN, pg_trgm), top-N, автор совпал;
 *    confidence: HIGH ≥90, MEDIUM 70–90, LOW <70;
 * 4. неоднозначность (равные score) → НЕ склеивать, draft.
 */
export async function matchBook(
  prisma: PrismaClient,
  input: MatchInput,
): Promise<MatchResult> {
  const normTitle = normalizeTitle(input.title);
  if (!normTitle) return { book: null, confidence: null, candidates: [] };

  // ——— 1. externalId (сильнейший сигнал) ———
  if (input.externalId && input.source) {
    const byExternalId = await prisma.book.findFirst({
      where: { source: input.source as never, externalId: input.externalId },
      select: BOOK_SELECT,
    });
    if (byExternalId) {
      return { book: toCandidate(byExternalId), confidence: "HIGH", candidates: [] };
    }
  }

  // ——— 2. Точное совпадение ———
  const exact = await findExactMatch(prisma, input, normTitle);
  if (exact) return exact;

  // ——— 3. Fuzzy (pg_trgm similarity) ———
  return findFuzzyMatch(prisma, input, normTitle);
}

async function findExactMatch(
  prisma: PrismaClient,
  input: MatchInput,
  normTitle: string,
): Promise<MatchResult | null> {
  const hasAuthorResolved = typeof input.authorId === "number";

  if (hasAuthorResolved && input.authorId !== null) {
    // 3a. точное (normTitle, authorId)
    const byAuthorId = await prisma.book.findMany({
      where: { authorId: input.authorId as number },
      select: BOOK_SELECT,
    });
    const exact = byAuthorId.filter((b) => normalizeTitle(b.title) === normTitle);
    if (exact.length === 1) return resultHigh(exact[0]!);
    if (exact.length > 1) return { book: null, confidence: "MEDIUM", candidates: exact.map(toCandidate) };
    // fallthrough → 3b (строка) и дальше fuzzy (автор уже резолвнут — строка та же)
  }
  if (!hasAuthorResolved) {
    if (input.author) {
      // 3b. (normTitle, норм-строка автора) — fallback для нерезолвнутых
      const normAuthor = normalizeTitle(input.author);
      const rows = await prisma.$queryRaw<
        Array<{
          id: number;
          title: string;
          author: string | null;
          authorId: number | null;
          coverImageUrl: string;
          slug: string | null;
          status: string;
          source: string | null;
          externalId: string | null;
          publishedYear: number | null;
          rating: number | null;
        }>
      >`SELECT id, title, author, "authorId", "coverImageUrl", slug, status, source, "externalId", "publishedYear", rating
        FROM ${ENTITY} WHERE lower(trim(author)) = ${normAuthor}`;
      const exact = rows.filter((b) => normalizeTitle(b.title) === normTitle);
      if (exact.length === 1) return resultHigh(toCandidate(exact[0]!));
      if (exact.length > 1) {
        return { book: null, confidence: "MEDIUM", candidates: exact.map(toCandidate) };
      }
    } else {
      // 3c. безавторные: только по normTitle И ровно один кандидат
      const rows = await prisma.$queryRaw<
        Array<{
          id: number;
          title: string;
          author: string | null;
          authorId: number | null;
          coverImageUrl: string;
          slug: string | null;
          status: string;
          source: string | null;
          externalId: string | null;
          publishedYear: number | null;
          rating: number | null;
        }>
      >`SELECT id, title, author, "authorId", "coverImageUrl", slug, status, source, "externalId", "publishedYear", rating
        FROM ${ENTITY} WHERE "authorId" IS NULL`;
      const exact = rows.filter((b) => normalizeTitle(b.title) === normTitle);
      if (exact.length === 1) return resultHigh(toCandidate(exact[0]!));
      if (exact.length > 1) {
        return { book: null, confidence: "MEDIUM", candidates: exact.map(toCandidate) };
      }
    }
  }
  return null;
}

interface FuzzyRow {
  id: number;
  title: string;
  author: string | null;
  authorId: number | null;
  coverImageUrl: string;
  slug: string | null;
  status: string;
  source: string | null;
  externalId: string | null;
  publishedYear: number | null;
  rating: number | null;
  score: number;
}

async function findFuzzyMatch(
  prisma: PrismaClient,
  input: MatchInput,
  normTitle: string,
): Promise<MatchResult> {
  // top-N по триграммному сходству; GIN-индекс books_trgm_idx на title
  const rows = await prisma.$queryRaw<FuzzyRow[]>`
    SELECT id, title, author, "authorId", "coverImageUrl", slug, status, source, "externalId", "publishedYear", rating,
           similarity(title, ${normTitle}) AS score
    FROM ${ENTITY}
    WHERE title % ${normTitle}
    ORDER BY score DESC
    LIMIT 5`;

  // Автор обязан совпасть: по authorId при резолве, иначе по нормализованной строке
  const normAuthor = input.author ? normalizeTitle(input.author) : null;
  const candidates = rows.filter((row) => {
    if (normTitle === normalizeTitle(row.title)) return false; // точные уже разобраны
    if (typeof input.authorId === "number") {
      return row.authorId === input.authorId;
    }
    if (normAuthor && row.author) {
      return normalizeTitle(row.author) === normAuthor;
    }
    // безавторный вход — только безавторные кандидаты
    return !input.author && row.authorId === null;
  });

  if (candidates.length === 0) {
    return { book: null, confidence: null, candidates: [] };
  }

  const top = candidates[0]!;
  const scorePercent = Math.round(top.score * 100);

  // Неоднозначность: два кандидата с одинаковым score → draft (не склеивать)
  const second = candidates[1];
  if (second && Math.abs(second.score - top.score) < 0.001) {
    return {
      book: null,
      confidence: "MEDIUM",
      candidates: candidates.map(toCandidate),
    };
  }

  if (scorePercent >= 90) {
    return { book: toCandidate(top), confidence: "HIGH", candidates: [] };
  }
  if (scorePercent >= 70) {
    return { book: null, confidence: "MEDIUM", candidates: candidates.map(toCandidate) };
  }
  return { book: null, confidence: "LOW", candidates: [] };
}

function resultHigh(book: BookCandidate): MatchResult {
  return { book, confidence: "HIGH", candidates: [] };
}