/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import {
  resolveArchetype,
  calculateCompatibility,
  type CompatibilityResult,
} from "./compatibility.calculator.js";
import type {
  DnaAxes,
  DnaBookItem,
  ReadingDnaInput,
} from "./readingDna.schema.js";

const AXIS_KEYS: (keyof DnaAxes)[] = [
  "storyFocus",
  "emotionalWeight",
  "pace",
  "darkness",
  "scope",
  "complexity",
];

/** Минимальное число книг с заполненным readingProfile для расчёта ДНК знаменитости. */
export const MIN_PROFILED_BOOKS_FOR_CELEBRITY_DNA = 3;

export interface CelebrityDnaProfile {
  id: number;
  slug: string;
  name: string;
  photoUrl: string;
  category: string;
  focalX: number;
  focalY: number;
  archetype: string;
  archetypeName: string;
  motto: string;
  axes: DnaAxes;
  favoriteBooks: DnaBookItem[];
  kryptoniteBook: DnaBookItem | null;
  likedGenres: string[];
  favoriteAuthors: string[];
  booksCount: number;
}

interface RawBookReadingProfile {
  storyFocus?: number;
  emotionalWeight?: number;
  pace?: number;
  darkness?: number;
  scope?: number;
  complexity?: number;
  confidence?: Partial<Record<keyof DnaAxes, number>>;
}

function isValidReadingProfile(raw: unknown): raw is RawBookReadingProfile {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  return AXIS_KEYS.every(
    (k) => typeof obj[k] === "number" && Number.isFinite(obj[k] as number)
  );
}

/**
 * Вес книги в расчёте 6 осей вкуса в зависимости от позиции её тира (0 = верхний тир).
 */
function getTierWeight(tierIndex: number, totalTiers: number): number {
  if (totalTiers <= 1) return 1;
  const normalized = Math.max(0, Math.min(1, tierIndex / (totalTiers - 1)));
  // От 1.5 (верхний тир) до 0.5 (нижний тир)
  return 1.5 - normalized;
}

/**
 * Вычисляет Reading DNA знаменитости из её реального тир-листа (CelebrityBook + Book.readingProfile).
 * - Первые 3 книги тир-листа → favoriteBooks (священные книги).
 * - Последняя книга тир-листа (при >= 4 книгах) → kryptoniteBook (криптонит).
 * - Оси вкуса → взвешенное среднее по книгам с readingProfile (исключая криптонит, если остальных >= 3).
 */
export function buildCelebrityDnaProfile(celebrity: {
  id: number;
  slug: string;
  name: string;
  photoUrl: string;
  category: string;
  focalX: number;
  focalY: number;
  tierOrder: string[];
  catalogBooks: Array<{
    tierId: string | null;
    rank: number;
    book: {
      id: number;
      title: string;
      author: string | null;
      coverImageUrl: string;
      genre: string | null;
      readingProfile: unknown;
    };
  }>;
}): CelebrityDnaProfile | null {
  if (!celebrity.catalogBooks || celebrity.catalogBooks.length < 3) {
    return null;
  }

  const tierOrder = Array.isArray(celebrity.tierOrder) ? celebrity.tierOrder : [];
  const tierIndexMap = new Map<string, number>();
  tierOrder.forEach((tid, idx) => tierIndexMap.set(tid, idx));

  const fallbackTierIdx = tierOrder.length;

  // Сортируем книги тир-листа сверху вниз: сначала по позиции тира в tierOrder, затем по rank
  const ordered = [...celebrity.catalogBooks].sort((a, b) => {
    const tA = a.tierId != null && tierIndexMap.has(a.tierId)
      ? tierIndexMap.get(a.tierId)!
      : fallbackTierIdx;
    const tB = b.tierId != null && tierIndexMap.has(b.tierId)
      ? tierIndexMap.get(b.tierId)!
      : fallbackTierIdx;
    if (tA !== tB) return tA - tB;
    return a.rank - b.rank;
  });

  // Последняя книга тир-листа становится криптонитом (при условии >= 4 книг, чтобы не пересекалась с топ-3)
  const kryptoniteEntry = ordered.length >= 4 ? ordered[ordered.length - 1]! : null;
  const kryptoniteBook: DnaBookItem | null = kryptoniteEntry
    ? {
        title: kryptoniteEntry.book.title,
        author: kryptoniteEntry.book.author || undefined,
        bookId: kryptoniteEntry.book.id,
        coverImageUrl: kryptoniteEntry.book.coverImageUrl || undefined,
      }
    : null;

  // Топ-3 священные книги — первые 3 книги в тир-листе
  const favoriteBooks: DnaBookItem[] = ordered.slice(0, 3).map((entry) => ({
    title: entry.book.title,
    author: entry.book.author || undefined,
    bookId: entry.book.id,
    coverImageUrl: entry.book.coverImageUrl || undefined,
  }));

  // Книги с заполненным readingProfile
  const allProfiled = ordered.filter((entry) =>
    isValidReadingProfile(entry.book.readingProfile)
  );
  if (allProfiled.length < MIN_PROFILED_BOOKS_FOR_CELEBRITY_DNA) {
    return null;
  }

  // Если без криптонита остаётся >= 3 размеченных книг, не учитываем криптонит в положительном вкусе
  const profiledForAxes =
    kryptoniteEntry && allProfiled.length - 1 >= MIN_PROFILED_BOOKS_FOR_CELEBRITY_DNA
      ? allProfiled.filter((e) => e.book.id !== kryptoniteEntry.book.id)
      : allProfiled;

  const distinctTiersCount = Math.max(1, tierOrder.length);
  const sums: Record<keyof DnaAxes, number> = {
    storyFocus: 0,
    emotionalWeight: 0,
    pace: 0,
    darkness: 0,
    scope: 0,
    complexity: 0,
  };
  const weightSums: Record<keyof DnaAxes, number> = {
    storyFocus: 0,
    emotionalWeight: 0,
    pace: 0,
    darkness: 0,
    scope: 0,
    complexity: 0,
  };

  for (const entry of profiledForAxes) {
    const profile = entry.book.readingProfile as RawBookReadingProfile;
    const tIdx =
      entry.tierId != null && tierIndexMap.has(entry.tierId)
        ? tierIndexMap.get(entry.tierId)!
        : Math.max(0, distinctTiersCount - 1);
    const tierWeight = getTierWeight(tIdx, distinctTiersCount);

    for (const key of AXIS_KEYS) {
      const val = profile[key] as number;
      const confRaw = profile.confidence?.[key];
      const conf =
        typeof confRaw === "number" && Number.isFinite(confRaw) && confRaw > 0
          ? confRaw
          : 1;
      const w = tierWeight * conf;
      sums[key] += val * w;
      weightSums[key] += w;
    }
  }

  const axes: DnaAxes = {
    storyFocus: Math.max(0, Math.min(100, Math.round(sums.storyFocus / (weightSums.storyFocus || 1)))),
    emotionalWeight: Math.max(0, Math.min(100, Math.round(sums.emotionalWeight / (weightSums.emotionalWeight || 1)))),
    pace: Math.max(0, Math.min(100, Math.round(sums.pace / (weightSums.pace || 1)))),
    darkness: Math.max(0, Math.min(100, Math.round(sums.darkness / (weightSums.darkness || 1)))),
    scope: Math.max(0, Math.min(100, Math.round(sums.scope / (weightSums.scope || 1)))),
    complexity: Math.max(0, Math.min(100, Math.round(sums.complexity / (weightSums.complexity || 1)))),
  };

  const archetypeDef = resolveArchetype(axes);

  // Топ-3 жанра среди не-криптонит книг
  const genreCounts = new Map<string, number>();
  for (const entry of ordered) {
    if (kryptoniteEntry && entry.book.id === kryptoniteEntry.book.id) continue;
    const g = entry.book.genre?.trim();
    if (g) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }
  const likedGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  const favoriteAuthors = Array.from(
    new Set(
      favoriteBooks
        .map((b) => b.author?.trim())
        .filter((a): a is string => Boolean(a))
    )
  ).slice(0, 5);

  return {
    id: celebrity.id,
    slug: celebrity.slug,
    name: celebrity.name,
    photoUrl: celebrity.photoUrl,
    category: celebrity.category,
    focalX: celebrity.focalX,
    focalY: celebrity.focalY,
    archetype: archetypeDef.id,
    archetypeName: archetypeDef.names.dark,
    motto: archetypeDef.quote,
    axes,
    favoriteBooks,
    kryptoniteBook,
    likedGenres,
    favoriteAuthors,
    booksCount: ordered.length,
  };
}

const CELEBRITY_DNA_CACHE_TTL_MS = 5 * 60_000;
let celebrityDnaCache: { data: CelebrityDnaProfile[]; expiresAt: number } | null = null;

export function clearCelebrityDnaCache(): void {
  celebrityDnaCache = null;
}

/**
 * Возвращает список всех опубликованных знаменитостей BookStrata с вычисленным ДНК.
 */
export async function getCelebritiesWithDna(): Promise<CelebrityDnaProfile[]> {
  const now = Date.now();
  if (celebrityDnaCache && celebrityDnaCache.expiresAt > now) {
    return celebrityDnaCache.data;
  }

  const celebrities = await prisma.celebrity.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      photoUrl: true,
      category: true,
      focalX: true,
      focalY: true,
      tierOrder: true,
      catalogBooks: {
        select: {
          tierId: true,
          rank: true,
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverImageUrl: true,
              genre: true,
              readingProfile: true,
            },
          },
        },
      },
    },
  });

  const profiles = celebrities
    .map((celeb) => buildCelebrityDnaProfile(celeb))
    .filter((p): p is CelebrityDnaProfile => p !== null);

  celebrityDnaCache = { data: profiles, expiresAt: now + CELEBRITY_DNA_CACHE_TTL_MS };
  return profiles;
}

/**
 * Проводит дуэль читателя со знаменитостью из базы BookStrata.
 */
export async function conductCelebrityDuel(params: {
  slug: string;
  challengerTicketNumber?: string;
  challengerDna?: ReadingDnaInput;
}): Promise<CompatibilityResult & { celebrity: CelebrityDnaProfile }> {
  const list = await getCelebritiesWithDna();
  const celebrity = list.find((c) => c.slug === params.slug);
  if (!celebrity) {
    throw new NotFoundError(`Знаменитость «${params.slug}» не найдена или не имеет профиля ДНК`);
  }

  let challengerProfile: ReadingDnaInput;
  if (params.challengerTicketNumber) {
    const record = await prisma.readingDna.findUnique({
      where: { ticketNumber: params.challengerTicketNumber },
    });
    if (!record) {
      throw new NotFoundError(
        `Билет «${params.challengerTicketNumber}» не найден`
      );
    }
    challengerProfile = {
      axes: {
        storyFocus: record.storyFocus,
        emotionalWeight: record.emotionalWeight,
        pace: record.pace,
        darkness: record.darkness,
        scope: record.scope,
        complexity: record.complexity,
      },
      favoriteBooks: record.favoriteBooks as any,
      kryptoniteBook: (record.kryptoniteBook as any) ?? null,
      likedGenres: record.likedGenres,
      dislikedGenres: record.dislikedGenres,
      favoriteAuthors: record.favoriteAuthors,
      theme: record.theme as "dark" | "craft",
    };
  } else if (params.challengerDna) {
    challengerProfile = params.challengerDna;
  } else {
    throw new NotFoundError("Данные читателя для дуэли не предоставлены");
  }

  const celebrityInput: ReadingDnaInput = {
    axes: celebrity.axes,
    favoriteBooks: celebrity.favoriteBooks,
    kryptoniteBook: celebrity.kryptoniteBook,
    likedGenres: celebrity.likedGenres,
    dislikedGenres: [],
    favoriteAuthors: celebrity.favoriteAuthors,
    theme: "dark",
  };

  const result = calculateCompatibility(celebrityInput, challengerProfile);
  return {
    ...result,
    celebrity,
  };
}
