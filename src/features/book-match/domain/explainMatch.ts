// src/features/book-match/domain/explainMatch.ts
// Explain Match — детерминированное объяснение совпадения/расхождения по осям.

import type { ReadingProfile, UserMood, MatchAxis, AxisDiff } from "./types";
import { AXIS_LABELS } from "./types";

/** Все оси совместимости. */
const ALL_AXES: MatchAxis[] = ["storyFocus", "emotionalWeight", "pace", "darkness"];

/** Пороговые значения для классификации расхождений. */
const DIFF_THRESHOLDS = {
  IDEAL: 10,       // < 10 → почти идеально
  GOOD: 20,        // < 20 → хорошее совпадение
  NOTICEABLE: 30,  // < 30 → есть разница
  STRONG: 40,      // < 40 → заметное расхождение
                   // >= 40 → сильное расхождение
} as const;

/** Описание направления расхождения. */
function describeDirection(axis: MatchAxis, diff: number): string {
  const direction = diff > 0 ? "right" : "left";

  const axisDir: Record<MatchAxis, { right: string; left: string }> = {
    storyFocus:      { right: "более рефлексивная", left: "более сюжетная" },
    emotionalWeight: { right: "тяжелее", left: "легче" },
    pace:            { right: "медленнее", left: "быстрее" },
    darkness:        { right: "мрачнее", left: "светлее" },
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
export function explainMatch(user: UserMood, book: ReadingProfile): ExplainResult {
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

  const matches = diffs.filter((d) => d.absDiff < DIFF_THRESHOLDS.GOOD);
  const mismatches = diffs.filter((d) => d.absDiff >= DIFF_THRESHOLDS.NOTICEABLE);

  const averageDifference =
    diffs.length > 0
      ? Math.round(diffs.reduce((sum, d) => sum + d.absDiff, 0) / diffs.length)
      : 0;

  return { diffs, matches, mismatches, averageDifference };
}

/** Экспортируем describeDiff для использования в UI. */
export { describeDiff };
