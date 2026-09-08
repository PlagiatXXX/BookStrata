// src/features/book-match/domain/matchScore.ts
// Match Score — расчёт совместимости читателя и книги.
// Domain layer: чистая математика, без React/DOM.

import type { ReadingProfile, UserMood, MatchAxis } from "./types";
import { AXIS_WEIGHTS } from "./types";
import { perceptual } from "./perceptualScale";

/** Все оси совместимости. */
const ALL_AXES: MatchAxis[] = ["storyFocus", "emotionalWeight", "pace", "darkness"];

/**
 * Рассчитывает Match Score (0–100) между настроением пользователя и профилем книги.
 *
 * Считаются только активные (set) оси UserMood.
 * Веса нормализуются пропорционально количеству активных осей.
 *
 * @returns 0–100, где 100 = идеальное совпадение.
 */
export function matchScore(user: UserMood, book: ReadingProfile): number {
  const activeAxes = ALL_AXES.filter(
    (axis): axis is MatchAxis => user[axis] !== undefined,
  );

  if (activeAxes.length === 0) return 0;

  // Сумма весов активных осей
  const totalWeight = activeAxes.reduce(
    (sum, axis) => sum + AXIS_WEIGHTS[axis],
    0,
  );

  // Взвешенное среднее схожести (с нелинейной шкалой)
  let score = 0;
  for (const axis of activeAxes) {
    const userVal = perceptual(user[axis]!);
    const bookVal = perceptual(book[axis]);
    const similarity = 1 - Math.abs(userVal - bookVal) / 100;
    score += (similarity * AXIS_WEIGHTS[axis]) / totalWeight;
  }

  return Math.round(score * 100);
}
