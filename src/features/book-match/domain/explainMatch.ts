// src/features/book-match/domain/explainMatch.ts
// Explain Match — детерминированное объяснение совпадения/расхождения по осям.

import type { ReadingProfile, UserMood, SliderAxis, AxisDiff } from "./types";
import { AXIS_LABELS } from "./types";

/** Все оси совместимости. */
const ALL_AXES: SliderAxis[] = ["storyFocus", "emotionalWeight", "pace", "darkness", "scope", "complexity"];

/** Пороговые значения для классификации расхождений. */
const DIFF_THRESHOLDS = {
  IDEAL: 10,       // < 10 → почти идеально
  GOOD: 20,        // < 20 → хорошее совпадение
  NOTICEABLE: 30,  // < 30 → есть разница
  STRONG: 40,      // < 40 → заметное расхождение
                   // >= 40 → сильное расхождение
} as const;

/** Описание направления расхождения. */
function describeDirection(axis: SliderAxis, diff: number): string {
  const direction = diff > 0 ? "right" : "left";

  const axisDir: Record<SliderAxis, { right: string; left: string }> = {
    storyFocus:      { right: "более рефлексивная", left: "более сюжетная" },
    emotionalWeight: { right: "тяжелее", left: "легче" },
    pace:            { right: "медленнее", left: "быстрее" },
    darkness:        { right: "мрачнее", left: "светлее" },
    scope:           { right: "эпичнее", left: "камернее" },
    complexity:      { right: "многослойнее", left: "проще" },
  };

  return axisDir[axis][direction];
}

/** Описание разницы (человеческое). */
function describeDiff(absDiff: number, direction: string): string {
  if (absDiff < DIFF_THRESHOLDS.IDEAL) return "почти идеально";
  if (absDiff < DIFF_THRESHOLDS.GOOD) return "хорошее совпадение";
  if (absDiff < DIFF_THRESHOLDS.NOTICEABLE) return `книга ${direction}`;
  if (absDiff < DIFF_THRESHOLDS.STRONG) return `книга заметно ${direction}`;
  return `книга значительно ${direction}`;
}

export interface ExplainResult {
  /** Все diffs (для активных осей). */
  diffs: AxisDiff[];
  /** Совпавшие оси (absDiff < 20). */
  matches: AxisDiff[];
  /** Расходящиеся оси (absDiff > 29). */
  mismatches: AxisDiff[];
  /** Среднее расхождение по всем активным осям. */
  averageDifference: number;
}

/**
 * Генерирует детерминированное объяснение совпадения.
 * Не использует LLM — только math + правила.
 */
export function explainMatch(user: UserMood, book: ReadingProfile, genreSim?: number): ExplainResult {
  const diffs: AxisDiff[] = [];

  for (const axis of ALL_AXES) {
    const userVal = user[axis];
    if (userVal === undefined) continue;

    const bookVal = book[axis];
    const diff = bookVal - userVal;
    const absDiff = Math.abs(diff);
    const direction = describeDirection(axis, diff);

    diffs.push({
      axis,
      label: `${AXIS_LABELS[axis].left} ↔ ${AXIS_LABELS[axis].right}`,
      userValue: userVal,
      bookValue: bookVal,
      diff,
      absDiff,
      direction,
    });
  }

  // Оставляем порядок осей стабильным (ALL_AXES), не сортируем по absDiff

  // Жанровая ось: userValue=100 (хочу попадание), bookValue=genreSim.
  const genreDiff: AxisDiff | null =
    genreSim !== undefined
      ? {
          axis: "genre",
          label: "Жанр",
          userValue: 100,
          bookValue: genreSim,
          diff: genreSim - 100,
          absDiff: 100 - genreSim,
          direction:
            genreSim >= 70
              ? "совпадает с твоими жанрами"
              : genreSim >= 40
                ? "частично совпадает с твоими жанрами"
                : "не совпадает с твоими жанрами",
        }
      : null;
  if (genreDiff) diffs.push(genreDiff);

  // Пороги жанра отличаются от absDiff-порогов слайдер-осей (спека §4):
  // genreSim ≥ 40 → matches, < 40 → mismatches.
  const matches = diffs.filter((d) => d.axis !== "genre" && d.absDiff < DIFF_THRESHOLDS.GOOD);
  const mismatches = diffs.filter((d) => d.axis !== "genre" && d.absDiff >= DIFF_THRESHOLDS.NOTICEABLE);
  if (genreDiff) {
    if (genreSim! >= 40) matches.push(genreDiff);
    else mismatches.push(genreDiff);
  }

  const averageDifference =
    diffs.length > 0
      ? Math.round(diffs.reduce((sum, d) => sum + d.absDiff, 0) / diffs.length)
      : 0;

  return { diffs, matches, mismatches, averageDifference };
}

/** Экспортируем describeDiff для использования в UI. */
export { describeDiff };
