// src/features/book-match/components/BookMatchBadge.tsx
// Бейдж «эта книга подходит под сохранённое настроение читателя».
// Статичный снапшот на момент захода на страницу: читает localStorage
// при маунте, считает matchScore клиентски (профиль уже на странице).
// Показываем только сильные совпадения (≥ 75) — «СОМНИТЕЛЬНО» не хвалим.

import { readStoredMood } from "../hooks/useStoredMood";
import { matchScore } from "../domain/matchScore";
import { matchLevel } from "../domain/matchLevel";
import type { ReadingProfile } from "../domain/types";

interface BookMatchBadgeProps {
  book: ReadingProfile;
}

/** Показывать бейдж только при сильном совпадении. */
const MIN_BADGE_SCORE = 75;

export function BookMatchBadge({ book }: BookMatchBadgeProps) {
  const mood = readStoredMood();
  const hasMood = Object.keys(mood).length > 0;
  if (!hasMood) return null;

  const score = matchScore(mood, book);
  if (score < MIN_BADGE_SCORE) return null;

  const level = matchLevel(score);

  return (
    <span className="text-xs text-emerald-400/70">
      Подходит под твоё настроение · {score}%
      <span className="sr-only">{level.label}</span>
    </span>
  );
}
