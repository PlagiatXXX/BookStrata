// src/features/book-match/domain/matchLevel.ts
// Match Level — определение уровня совместимости по score (0–100).

import type { MatchLevel, MatchLevelLabel } from "./types";

/** Пороговые значения для уровней совместимости. */
const LEVELS: { min: number; label: MatchLevelLabel; color: MatchLevel["color"] }[] = [
  { min: 90, label: "ПОПАЛО В ТОЧКУ",   color: "emerald" },
  { min: 75, label: "ПОХОЖЕ, ЭТО ТВОЁ", color: "emerald" },
  { min: 55, label: "МОЖЕТ СРАБОТАТЬ",   color: "amber" },
  { min: 35, label: "СОМНИТЕЛЬНО",       color: "amber" },
  { min: 0,  label: "НЕ СЕЙЧАС",         color: "rose" },
];

/**
 * Возвращает уровень совместимости по score.
 */
export function matchLevel(score: number): MatchLevel {
  const clamped = Math.max(0, Math.min(100, score));
  for (const level of LEVELS) {
    if (clamped >= level.min) {
      return {
        label: level.label,
        color: level.color,
        range: `${level.min}–${level.min === 90 ? 100 : LEVELS[LEVELS.indexOf(level) - 1].min - 1}%`,
      };
    }
  }
  // Fallback (не должен сработать)
  return { label: "НЕ СЕЙЧАС", color: "rose", range: "0–34%" };
}
