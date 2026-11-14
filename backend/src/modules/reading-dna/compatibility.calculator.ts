import {
  ARCHETYPES,
  type ArchetypeDefinition,
  type AxisRange,
  type DnaAxisKey,
  type CasteInfo,
  type CasteId,
} from "./archetypes.data.js";
import type { DnaAxes, ReadingDnaInput } from "./readingDna.schema.js";

export {
  ARCHETYPES,
  type ArchetypeDefinition,
  type AxisRange,
  type DnaAxisKey,
  type CasteInfo,
  type CasteId,
};

export interface ArchetypeResolutionResult {
  archetype: ArchetypeDefinition;
  hits: number;
  distance: number;
}

const AXIS_KEYS: (keyof DnaAxes)[] = [
  "storyFocus",
  "emotionalWeight",
  "pace",
  "darkness",
  "scope",
  "complexity",
];

/**
 * Разрешает читательский архетип по диапазонам осей с подсчетом hits и distance.
 */
export function resolveArchetypeDetailed(axes: DnaAxes): ArchetypeResolutionResult {
  const first = ARCHETYPES[0];
  if (!first) {
    throw new Error("ARCHETYPES data is empty");
  }

  let bestArchetype: ArchetypeDefinition = first;
  let maxHits = -1;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const archetype of ARCHETYPES) {
    let hits = 0;
    let distance = 0;

    for (const key of AXIS_KEYS) {
      const val = axes[key];
      const range = archetype.axisRanges[key];
      if (val >= range.min && val <= range.max) {
        hits++;
      } else if (val < range.min) {
        distance += (range.min - val) / 100;
      } else {
        distance += (val - range.max) / 100;
      }
    }

    if (
      hits > maxHits ||
      (hits === maxHits && distance < minDistance)
    ) {
      maxHits = hits;
      minDistance = distance;
      bestArchetype = archetype;
    }
  }

  return {
    archetype: bestArchetype,
    hits: maxHits,
    distance: minDistance,
  };
}

/**
 * Определяет ближайший читательский архетип по 6 непрерывным осям (диапазонная модель).
 */
export function resolveArchetype(axes: DnaAxes): ArchetypeDefinition {
  return resolveArchetypeDetailed(axes).archetype;
}

/** Показатель нелинейности штрафа по осям: (Δ/100)^1.3 — малые расхождения почти не штрафуются, экстремальные — жёстко. */
export const AXES_PENALTY_POWER = 1.3;

/** Веса осей восприятия (соответствуют src/features/book-match/domain/types.ts). */
export const AXIS_WEIGHTS = {
  storyFocus: 0.2,
  emotionalWeight: 0.2,
  pace: 0.15,
  darkness: 0.15,
  scope: 0.15,
  complexity: 0.15,
} as const;

/** Веса компонентов (в сумме нормируются по НАЛИЧИЮ данных). */
export const COMPONENT_WEIGHTS = {
  axes: 0.5556,
  books: 0.1111,
  likedGenres: 0.0556,
  dislikedGenres: 0.1667,
  authors: 0.1111,
} as const;

/** Штраф за жанровый конфликт (мой любимый жанр = чужой неприязненный). */
export const GENRE_CONFLICT_PENALTY = 0.08;

/** Штраф за «святыня = чей-то криптонит». */
export const KRYPTONITE_CONFLICT_PENALTY = 0.25;

/** Бонус за общий криптонит (общая антипатия — эффект Боссона). */
export const KRYPTONITE_MATCH_BONUS = 0.04;

/** Экспонента для доли общих книг: (shared/3)^0.3 — «скачок Эврики». */
export const BOOK_OVERLAP_POWER = 0.3;

/** Параметры нормализации (sigmoid). */
export const CALIBRATION = { k: 6, t0: 0.39, max: 97 } as const;

export interface CompatibilityBreakdown {
  axesSimilarity: number;
  genreScore: number;
  bookScore: number;
  authorScore: number;
  sharedDislikeBonus: number;
  kryptoniteConflict: boolean;
  kryptonitePenalty: number;
}

export interface CompatibilityResult {
  compatibility: number;
  verdict: string;
  breakdown: CompatibilityBreakdown;
}

/**
 * Нормализует строку для сравнения (удаление лишних пробелов, регистр).
 */
function normalizeText(text?: string | null): string {
  return (text || "").trim().toLowerCase();
}

/**
 * Коэффициент Жаккара для двух массивов строк |A ∩ B| / |A ∪ B|.
 */
function calculateJaccard(arrA: string[], arrB: string[]): number {
  const setA = new Set(arrA.map(normalizeText).filter(Boolean));
  const setB = new Set(arrB.map(normalizeText).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Проверяет, совпадают ли два криптонита.
 */
function isSameKryptonite(
  k1?: { title: string; bookId?: number | null } | null,
  k2?: { title: string; bookId?: number | null } | null
): boolean {
  if (!k1 || !k2) return false;
  if (k1.bookId && k2.bookId && k1.bookId === k2.bookId) return true;
  const t1 = normalizeText(k1.title);
  const t2 = normalizeText(k2.title);
  return t1.length > 0 && t1 === t2;
}

/**
 * Проверяет наличие конфликта: любимая книга одного является криптонитом другого.
 */
function checkKryptoniteConflict(a: ReadingDnaInput, b: ReadingDnaInput): boolean {
  if (b.kryptoniteBook) {
    const kTitle = normalizeText(b.kryptoniteBook.title);
    const kId = b.kryptoniteBook.bookId;
    const hasConflict = a.favoriteBooks.some((bk) => {
      if (kId && bk.bookId && bk.bookId === kId) return true;
      return kTitle.length > 0 && normalizeText(bk.title) === kTitle;
    });
    if (hasConflict) return true;
  }

  if (a.kryptoniteBook) {
    const kTitle = normalizeText(a.kryptoniteBook.title);
    const kId = a.kryptoniteBook.bookId;
    const hasConflict = b.favoriteBooks.some((bk) => {
      if (kId && bk.bookId && bk.bookId === kId) return true;
      return kTitle.length > 0 && normalizeText(bk.title) === kTitle;
    });
    if (hasConflict) return true;
  }

  return false;
}

/**
 * Психометрический расчет совместимости читательских профилей (0..97%).
 */
export function calculateCompatibility(
  a: ReadingDnaInput,
  b: ReadingDnaInput
): CompatibilityResult {
  // 1. Подобие осей восприятия с нелинейным штрафом
  const axisKeys: (keyof DnaAxes)[] = [
    "storyFocus",
    "emotionalWeight",
    "pace",
    "darkness",
    "scope",
    "complexity",
  ];

  let axesSimilarityFraction = 0;
  for (const key of axisKeys) {
    const diff = Math.abs(a.axes[key] - b.axes[key]);
    const simAxis = 1 - Math.pow(diff / 100, AXES_PENALTY_POWER);
    axesSimilarityFraction += AXIS_WEIGHTS[key] * simAxis;
  }
  axesSimilarityFraction = Math.max(0, Math.min(1, axesSimilarityFraction));
  const axesSimilarity = Math.round(axesSimilarityFraction * 100);

  // 2. Доля общих книг (со «скачком Эврики»)
  const hasBooks = a.favoriteBooks.length > 0 && b.favoriteBooks.length > 0;
  let sharedBooksCount = 0;
  if (hasBooks) {
    for (const bookA of a.favoriteBooks) {
      const titleA = normalizeText(bookA.title);
      const matched = b.favoriteBooks.some((bookB) => {
        if (bookA.bookId && bookB.bookId && bookA.bookId === bookB.bookId) return true;
        return titleA.length > 0 && normalizeText(bookB.title) === titleA;
      });
      if (matched) sharedBooksCount++;
    }
  }
  // Зажимаем максимум 3 книги для расчета
  const clampedSharedBooks = Math.min(3, sharedBooksCount);
  const bookScoreFraction = hasBooks
    ? Math.pow(clampedSharedBooks / 3, BOOK_OVERLAP_POWER)
    : 0;
  const bookScore = Math.round(bookScoreFraction * 100);

  // 3. Жанры и авторы через Jaccard
  const hasLiked = a.likedGenres.length > 0 && b.likedGenres.length > 0;
  const likedJaccard = hasLiked
    ? calculateJaccard(a.likedGenres, b.likedGenres)
    : 0;

  const hasDisliked = a.dislikedGenres.length > 0 && b.dislikedGenres.length > 0;
  const dislikedJaccard = hasDisliked
    ? calculateJaccard(a.dislikedGenres, b.dislikedGenres)
    : 0;

  const hasAuthors = a.favoriteAuthors.length > 0 && b.favoriteAuthors.length > 0;
  const authorsJaccard = hasAuthors
    ? calculateJaccard(a.favoriteAuthors, b.favoriteAuthors)
    : 0;
  const authorScore = Math.round(authorsJaccard * 100);

  // Взвешенное среднее для жанров в breakdown
  const genreScore = Math.round(
    ((likedJaccard * COMPONENT_WEIGHTS.likedGenres +
      dislikedJaccard * COMPONENT_WEIGHTS.dislikedGenres) /
      (COMPONENT_WEIGHTS.likedGenres + COMPONENT_WEIGHTS.dislikedGenres)) *
      100
  );

  // 4. Взвешивание ТОЛЬКО по доступным компонентам
  let availableWeightSum = COMPONENT_WEIGHTS.axes;
  let weightedSum = COMPONENT_WEIGHTS.axes * axesSimilarityFraction;

  if (hasBooks) {
    availableWeightSum += COMPONENT_WEIGHTS.books;
    weightedSum += COMPONENT_WEIGHTS.books * bookScoreFraction;
  }

  if (hasLiked) {
    availableWeightSum += COMPONENT_WEIGHTS.likedGenres;
    weightedSum += COMPONENT_WEIGHTS.likedGenres * likedJaccard;
  }

  if (hasDisliked) {
    availableWeightSum += COMPONENT_WEIGHTS.dislikedGenres;
    weightedSum += COMPONENT_WEIGHTS.dislikedGenres * dislikedJaccard;
  }

  if (hasAuthors) {
    availableWeightSum += COMPONENT_WEIGHTS.authors;
    weightedSum += COMPONENT_WEIGHTS.authors * authorsJaccard;
  }

  let t = weightedSum / availableWeightSum;

  // 5. Коррекции
  // 5.1 Жанровый конфликт (мой любимый = чужой неприязненный)
  const conflictAB = calculateJaccard(a.likedGenres, b.dislikedGenres);
  const conflictBA = calculateJaccard(b.likedGenres, a.dislikedGenres);
  const maxGenreConflict = Math.max(conflictAB, conflictBA);
  if (maxGenreConflict > 0) {
    t -= GENRE_CONFLICT_PENALTY * maxGenreConflict;
  }

  // 5.2 Общий криптонит — эффект Боссона (бонус)
  const sameKryptonite = isSameKryptonite(a.kryptoniteBook, b.kryptoniteBook);
  if (sameKryptonite) {
    t += KRYPTONITE_MATCH_BONUS;
  }

  // 5.3 Святыня vs криптонит — ценностный конфликт (штраф)
  const kryptoniteConflict = checkKryptoniteConflict(a, b);
  if (kryptoniteConflict) {
    t -= KRYPTONITE_CONFLICT_PENALTY;
  }

  // 6. Нормализация (sigmoid-калибровка)
  t = Math.max(0, Math.min(1, t));
  const sigmoid =
    CALIBRATION.max / (1 + Math.exp(-CALIBRATION.k * (t - CALIBRATION.t0)));
  const finalCompatibility = Math.max(
    0,
    Math.min(CALIBRATION.max, Math.round(sigmoid))
  );

  // 7. Вердикт дуэли
  let verdict: string;
  if (kryptoniteConflict) {
    verdict = "Взрывоопасная смесь: ваша любимая книга — криптонит оппонента!";
  } else if (finalCompatibility >= 90) {
    verdict = "Литературные соулмейты (Абсолютный книжный резонанс)";
  } else if (finalCompatibility >= 75) {
    verdict = "Книжные единомышленники (Отличное взаимопонимание вкусов)";
  } else if (finalCompatibility >= 50) {
    verdict = "Гармония контрастов (Общие темы с яркими спорами)";
  } else if (finalCompatibility >= 30) {
    verdict = "Разные литературные миры (Редкие точки соприкосновения)";
  } else {
    verdict = "Полярные противоположности (Литературная дуэль на смерть)";
  }

  const sharedDislikeBonus = Math.round(
    dislikedJaccard * COMPONENT_WEIGHTS.dislikedGenres * 100
  );
  const kryptonitePenalty = kryptoniteConflict
    ? Math.round(KRYPTONITE_CONFLICT_PENALTY * 100)
    : 0;

  return {
    compatibility: finalCompatibility,
    verdict,
    breakdown: {
      axesSimilarity,
      genreScore,
      bookScore,
      authorScore,
      sharedDislikeBonus,
      kryptoniteConflict,
      kryptonitePenalty,
    },
  };
}
