// backend/src/modules/books/readingMatch.service.ts
// Подбор книг под настроение пользователя (Book Match recommendations).
// Порт matchScore/perceptual с фронта (src/features/book-match/domain) —
// по конвенции проекта доменные типы/математика дублируются между
// фронт-фичей и бэк-модулем (как ReadingProfile в 3 местах).
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { validateReadingProfile, type ReadingProfile } from "./readingProfile.schema.js";

const AXES = ["storyFocus", "emotionalWeight", "pace", "darkness"] as const;
type MatchAxis = (typeof AXES)[number];

/** Настроение пользователя — только активные (заданные) оси. */
export type UserMood = Partial<Record<MatchAxis, number>>;

/** Веса осей (идентичны AXIS_WEIGHTS фронта, сумма = 1.0). */
const AXIS_WEIGHTS: Record<MatchAxis, number> = {
  storyFocus: 0.25,
  emotionalWeight: 0.30,
  pace: 0.20,
  darkness: 0.25,
};

/** Крутизна sigmoid (идентична K фронта). */
const K = 4.5;

/** Sigmoid-преобразование: линейное значение → воспринимаемое. */
function perceptual(linear: number): number {
  const x = (linear - 50) / 50;
  const sigmoid = 1 / (1 + Math.exp(-K * x));
  return Math.round(sigmoid * 100 * 10) / 10;
}

/** Match Score (0–100) между настроением и профилем книги. */
export function matchScore(user: UserMood, book: ReadingProfile): number {
  const activeAxes = AXES.filter((axis) => user[axis] !== undefined);
  if (activeAxes.length === 0) return 0;

  const totalWeight = activeAxes.reduce((sum, axis) => sum + AXIS_WEIGHTS[axis], 0);

  let score = 0;
  for (const axis of activeAxes) {
    const userVal = perceptual(user[axis]!);
    const bookVal = perceptual(book[axis]);
    const similarity = 1 - Math.abs(userVal - bookVal) / 100;
    score += (similarity * AXIS_WEIGHTS[axis]) / totalWeight;
  }

  return Math.round(score * 100);
}

/** Карточка рекомендации. */
export interface MatchedBook {
  id: number;
  slug: string;
  title: string;
  author: string | null;
  coverImageUrl: string;
  /** Match Score 0–100. */
  score: number;
}

/**
 * Топ-N опубликованных книг под настроение пользователя.
 * Профили достаём из БД (JSON), валидируем Zod-схемой, скорим в JS.
 * Тысячи книг — в памяти влезает, SQL-side sigmoid не нужен (YAGNI).
 */
export async function getMatchedBooks(
  mood: UserMood,
  limit = 3,
  excludeSlug?: string,
): Promise<MatchedBook[]> {
  const rows = await prisma.book.findMany({
    where: {
      status: "published",
      readingProfile: { not: Prisma.DbNull },
      coverImageUrl: { not: "" },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      author: true,
      coverImageUrl: true,
      readingProfile: true,
    },
  });

  const scored: MatchedBook[] = [];
  for (const row of rows) {
    if (!row.slug || row.slug === excludeSlug) continue;
    try {
      const bookProfile = validateReadingProfile(row.readingProfile);
      scored.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        author: row.author,
        coverImageUrl: row.coverImageUrl,
        score: matchScore(mood, bookProfile),
      });
    } catch {
      // Невалидный профиль в БД — пропускаем молча
    }
  }

  // Убывание score; детерминированный tie-break по названию
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ru"));
  return scored.slice(0, limit);
}
