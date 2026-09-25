// src/features/book-match/domain/matchScore.ts
// Match Score — расчёт совместимости читателя и книги.
// Domain layer: чистая математика, без React/DOM.

import type { ReadingProfile, UserMood, SliderAxis } from "./types";
import { AXIS_WEIGHTS } from "./types";
import { perceptual } from "./perceptualScale";

/** Слайдер-оси (без genre — жанр приходит предвычисленным genreSim). */
const ALL_AXES: SliderAxis[] = ["storyFocus", "emotionalWeight", "pace", "darkness", "scope", "complexity"];

/**
 * Рассчитывает Match Score (0–100) между настроением пользователя и профилем книги.
 *
 * Считаются только активные (set) оси UserMood + опциональная жанровая ось
 * (активна, когда передан genreSim — результат genreSimilarity()).
 * Веса нормализуются пропорционально сумме активных весов.
 *
 * @param genreSim Жанровое сходство 0–100 (или undefined — ось неактивна).
 * @returns 0–100, где 100 = идеальное совпадение.
 */
export function matchScore(user: UserMood, book: ReadingProfile, genreSim?: number): number {
  const activeAxes = ALL_AXES.filter((axis) => user[axis] !== undefined);
  const genreActive = genreSim !== undefined;

  if (activeAxes.length === 0 && !genreActive) return 0;

  // Сумма весов активных осей (включая genre при активности)
  let totalWeight = activeAxes.reduce(
    (sum, axis) => sum + AXIS_WEIGHTS[axis],
    0,
  );
  if (genreActive) totalWeight += AXIS_WEIGHTS.genre;

  // Взвешенное среднее схожести (с нелинейной шкалой)
  let score = 0;
  for (const axis of activeAxes) {
    const userVal = perceptual(user[axis]!);
    const bookVal = perceptual(book[axis]);
    const similarity = 1 - Math.abs(userVal - bookVal) / 100;
    score += (similarity * AXIS_WEIGHTS[axis]) / totalWeight;
  }

  // Жанровая ось: similarity = genreSim/100 (без perceptual — это уже мера)
  if (genreActive) {
    score += (genreSim! / 100) * AXIS_WEIGHTS.genre / totalWeight;
  }

  return Math.round(score * 100);
}
