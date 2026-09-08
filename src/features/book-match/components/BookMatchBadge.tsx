// src/features/book-match/components/BookMatchBadge.tsx
// Бейдж «эта книга подходит под сохранённое настроение читателя».
// Статичный снапшот на момент захода на страницу: читает localStorage
// при маунте, считает matchScore клиентски (профиль уже на странице).
// Показываем только сильные совпадения (≥ 75) — «СОМНИТЕЛЬНО» не хвалим.

import { Sparkles } from "lucide-react";
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
    <div
      className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5"
      aria-label={`Совпадение с вашим настроением ${score} процентов`}
    >
      <Sparkles className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
      <span className="text-xs font-medium text-emerald-300">
        Подходит под твоё настроение · {score}%
      </span>
      <span className="sr-only">{level.label}</span>
    </div>
  );
}
