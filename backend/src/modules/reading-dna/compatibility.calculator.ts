import { ARCHETYPES, type ArchetypeDefinition } from "./archetypes.data.js";
import type { DnaAxes, ReadingDnaInput } from "./readingDna.schema.js";

export { ARCHETYPES, type ArchetypeDefinition };

/**
 * Определяет ближайший читательский архетип по 6 непрерывным осям.
 */
export function resolveArchetype(axes: DnaAxes): ArchetypeDefinition {
  const first = ARCHETYPES[0];
  if (!first) {
    throw new Error("ARCHETYPES data is empty");
  }
  let closest: ArchetypeDefinition = first;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const archetype of ARCHETYPES) {
    const ideal = archetype.idealAxes;
    // Евклидово расстояние между вектором пользователя и идеалом архетипа
    const distSq =
      Math.pow(axes.storyFocus - ideal.storyFocus, 2) +
      Math.pow(axes.emotionalWeight - ideal.emotionalWeight, 2) +
      Math.pow(axes.pace - ideal.pace, 2) +
      Math.pow(axes.darkness - ideal.darkness, 2) +
      Math.pow(axes.scope - ideal.scope, 2) +
      Math.pow(axes.complexity - ideal.complexity, 2);

    if (distSq < minDistance) {
      minDistance = distSq;
      closest = archetype;
    }
  }

  return closest;
}

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
 * Психометрический расчет совместимости читательских профилей (0..100%).
 */
export function calculateCompatibility(
  a: ReadingDnaInput,
  b: ReadingDnaInput
): CompatibilityResult {
  // 1. Сходство 6 непрерывных осей восприятия (векторное расстояние)
  const maxPossibleDist = Math.sqrt(6 * Math.pow(100, 2)); // ~244.95
  const dist = Math.sqrt(
    Math.pow(a.axes.storyFocus - b.axes.storyFocus, 2) +
      Math.pow(a.axes.emotionalWeight - b.axes.emotionalWeight, 2) +
      Math.pow(a.axes.pace - b.axes.pace, 2) +
      Math.pow(a.axes.darkness - b.axes.darkness, 2) +
      Math.pow(a.axes.scope - b.axes.scope, 2) +
      Math.pow(a.axes.complexity - b.axes.complexity, 2)
  );

  const axesSimilarity = Math.max(0, Math.min(100, Math.round(100 - (dist / maxPossibleDist) * 100)));

  // 2. Жанровый резонанс
  const aLiked = new Set(a.likedGenres.map(normalizeText));
  const bLiked = new Set(b.likedGenres.map(normalizeText));
  let sharedLikedCount = 0;
  for (const g of aLiked) {
    if (bLiked.has(g)) sharedLikedCount++;
  }
  const maxGenres = Math.max(1, Math.max(a.likedGenres.length, b.likedGenres.length));
  const genreScore = Math.round((sharedLikedCount / maxGenres) * 100);

  // 3. Эффект Боссона: совпадение отвергаемых антипатий сближает сильнее
  const aDisliked = new Set(a.dislikedGenres.map(normalizeText));
  const bDisliked = new Set(b.dislikedGenres.map(normalizeText));
  let sharedDislikedCount = 0;
  for (const g of aDisliked) {
    if (bDisliked.has(g)) sharedDislikedCount++;
  }
  const sharedDislikeBonus = sharedDislikedCount * 8; // до +16-24% бонуса

  // 4. Резонанс любимых книг
  let sharedBooksCount = 0;
  for (const bookA of a.favoriteBooks) {
    const titleA = normalizeText(bookA.title);
    const matched = b.favoriteBooks.some((bookB) => {
      if (bookA.bookId && bookB.bookId && bookA.bookId === bookB.bookId) return true;
      return normalizeText(bookB.title) === titleA;
    });
    if (matched) sharedBooksCount++;
  }
  const bookScore = Math.round((sharedBooksCount / 3) * 100);

  // 5. Штраф за конфликт: любимая книга одного — криптонит другого
  let kryptoniteConflict = false;
  if (b.kryptoniteBook) {
    const kTitle = normalizeText(b.kryptoniteBook.title);
    const kId = b.kryptoniteBook.bookId;
    if (
      a.favoriteBooks.some(
        (bk) => (kId && bk.bookId === kId) || normalizeText(bk.title) === kTitle
      )
    ) {
      kryptoniteConflict = true;
    }
  }
  if (a.kryptoniteBook && !kryptoniteConflict) {
    const kTitle = normalizeText(a.kryptoniteBook.title);
    const kId = a.kryptoniteBook.bookId;
    if (
      b.favoriteBooks.some(
        (bk) => (kId && bk.bookId === kId) || normalizeText(bk.title) === kTitle
      )
    ) {
      kryptoniteConflict = true;
    }
  }
  const kryptonitePenalty = kryptoniteConflict ? 15 : 0;

  // 6. Авторский резонанс
  const aAuthors = new Set(a.favoriteAuthors.map(normalizeText));
  const bAuthors = new Set(b.favoriteAuthors.map(normalizeText));
  let sharedAuthorsCount = 0;
  for (const author of aAuthors) {
    if (bAuthors.has(author)) sharedAuthorsCount++;
  }
  const maxAuthors = Math.max(1, Math.max(a.favoriteAuthors.length, b.favoriteAuthors.length));
  const authorScore = Math.round((sharedAuthorsCount / maxAuthors) * 100);

  // 7. Итоговая формула совместимости (веса: 50% оси, 20% жанры, 15% книги, 15% авторы)
  const baseWeightedScore =
    axesSimilarity * 0.5 +
    genreScore * 0.2 +
    bookScore * 0.15 +
    authorScore * 0.15;

  let finalCompatibility = Math.round(
    baseWeightedScore + sharedDislikeBonus - kryptonitePenalty
  );

  // Ограничиваем рамками 0..100
  finalCompatibility = Math.max(0, Math.min(100, finalCompatibility));

  // 8. Вердикт дуэли
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
