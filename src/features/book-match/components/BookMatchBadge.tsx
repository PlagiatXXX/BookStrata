// src/features/book-match/components/BookMatchBadge.tsx
// Бейдж совместимости в hero-секции страницы книги.
// Поддерживает расчет по ДНК авторизованного читателя, фолбэк на настроение гостя
// и клик для плавного скролла к блоку #book-match.

import { useMemo } from "react";
import { readStoredMood } from "../hooks/useStoredMood";
import { matchScore } from "../domain/matchScore";
import { matchLevel } from "../domain/matchLevel";
import type { ReadingProfile } from "../domain/types";
import { useMyReadingDna } from "@/hooks/useMyReadingDna";
import { Icon } from "@/components/Icon";

interface BookMatchBadgeProps {
  book: ReadingProfile;
}

const MIN_BADGE_SCORE = 75;

export function BookMatchBadge({ book }: BookMatchBadgeProps) {
  const { dna } = useMyReadingDna();
  const storedMood = readStoredMood();
  const hasStoredMood = Object.keys(storedMood).length > 0;

  const handleScrollToMatch = () => {
    const target = document.getElementById("book-match");
    if (target) {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
  };

  const dnaResult = useMemo(() => {
    if (!dna || !dna.axes) return null;
    const score = matchScore(dna.axes, book);
    const level = matchLevel(score);
    return { score, level, archetypeName: dna.archetypeName };
  }, [dna, book]);

  const moodResult = useMemo(() => {
    if (dnaResult || !hasStoredMood) return null;
    const score = matchScore(storedMood, book);
    if (score < MIN_BADGE_SCORE) return null;
    const level = matchLevel(score);
    return { score, level };
  }, [dnaResult, hasStoredMood, storedMood, book]);

  // Сценарий 1: Пользователь с ДНК
  if (dnaResult) {
    const isHigh = dnaResult.score >= 75;
    const isMedium = dnaResult.score >= 50 && dnaResult.score < 75;
    const colorClasses = isHigh
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
      : isMedium
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20"
      : "text-white/60 bg-white/5 border-white/10 hover:bg-white/10";

    return (
      <button
        type="button"
        onClick={handleScrollToMatch}
        aria-controls="book-match"
        className={`mt-2 text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${colorClasses}`}
      >
        <Icon name="dna" className="text-sm shrink-0" />
        <span>
          Совместимость с твоим ДНК · <strong>{dnaResult.score}%</strong>{" "}
          <span className="opacity-80">({dnaResult.archetypeName})</span>
        </span>
        <Icon name="south" className="text-xs shrink-0 opacity-60 ml-0.5" />
      </button>
    );
  }

  // Сценарий 2: Гость с сохранённым сильным настроением
  if (moodResult) {
    return (
      <button
        type="button"
        onClick={handleScrollToMatch}
        aria-controls="book-match"
        className="mt-2 text-xs px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <Icon name="tune" className="text-sm shrink-0" />
        <span>Подходит под твоё настроение · <strong>{moodResult.score}%</strong></span>
        <Icon name="south" className="text-xs shrink-0 opacity-60 ml-0.5" />
      </button>
    );
  }

  // Сценарий 3: Гость без настроения или с невысоким совпадением — легкая подсказка-мост
  return (
    <button
      type="button"
      onClick={handleScrollToMatch}
      aria-controls="book-match"
      className="mt-2 text-xs text-white/60 hover:text-white/90 flex items-center gap-1 transition-colors cursor-pointer py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
    >
      <Icon name="tune" className="text-sm" />
      <span>Узнать совместимость с твоим вкусом ↓</span>
    </button>
  );
}
