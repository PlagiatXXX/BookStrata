// src/features/book-match/components/BookMatch.tsx
// BookMatch — контейнер: заголовок + слайдеры + результат.
// Слайдеры и результат живут одновременно.

import { useMemo } from "react";
import { BookMatchSlider } from "./BookMatchSlider";
import { BookMatchResult } from "./BookMatchResult";
import { BookRecommendations } from "./BookRecommendations";
import type { MatchAxis, ReadingProfile } from "../domain/types";
import { matchScore } from "../domain/matchScore";
import { matchLevel } from "../domain/matchLevel";
import { explainMatch } from "../domain/explainMatch";
import { useStoredMood } from "../hooks/useStoredMood";

interface BookMatchProps {
  book: ReadingProfile;
  bookTitle: string;
  /** Slug текущей книги — исключить её из рекомендаций. */
  bookSlug?: string;
}

const AXES: MatchAxis[] = ["storyFocus", "emotionalWeight", "pace", "darkness", "scope", "complexity"];

export function BookMatch({ book, bookTitle, bookSlug }: BookMatchProps) {
  // Mood персистентен: init из localStorage, изменения перезаписывают,
  // сброс удаляет (см. useStoredMood)
  const { mood: userMood, updateMood, resetMood } = useStoredMood();

  const handleSliderChange = (axis: MatchAxis, value: number) => {
    updateMood({ ...userMood, [axis]: value });
  };

  const handleReset = () => {
    resetMood();
  };

  // Вычисляем результат
  const activeAxesCount = Object.keys(userMood).length;

  const result = useMemo(() => {
    if (activeAxesCount === 0) return null;
    const score = matchScore(userMood, book);
    const level = matchLevel(score);
    const explanation = explainMatch(userMood, book);
    return { score, level, activeAxesCount, ...explanation };
  }, [userMood, book, activeAxesCount]);

  return (
    <section
      className="relative py-12 border-t border-primary/20"
      aria-label="Book Match"
    >
      <div className="max-w-275 mx-auto px-4 md:px-5">
        {/* Заголовок */}
        <div className="mb-8 text-center">
          <h2 className="bp-display text-white tracking-[0.2em] uppercase text-xl md:text-2xl mb-2">
            Тебе зайдёт эта книга?
          </h2>
          <p className="text-sm text-white/40">
            Настрой чтение под себя один раз и данные сохранятся
          </p>
          <div className="w-40 h-px bg-(--bp-primary) mx-auto mt-3" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Слайдеры */}
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Ваши ожидания</p>
            {AXES.map((axis) => (
              <BookMatchSlider
                key={axis}
                axis={axis}
                value={userMood[axis]}
                onChange={handleSliderChange}
              />
            ))}

            {/* Индикатор настроенных параметров */}
            {activeAxesCount > 0 && activeAxesCount < 6 && (
              <p className="text-center text-xs text-white/25 mt-4">
                {activeAxesCount} из 6 параметров настроены
              </p>
            )}
          </div>

          {/* Результат */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-6">Совместимость с {bookTitle}</p>
            {result ? (
              <BookMatchResult
                result={result}
                onReset={handleReset}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                <div className="text-4xl font-bold text-white/15 mb-2">—</div>
                <p className="text-xs text-white/30">
                  Настрой хотя бы одну шкалу, чтобы увидеть совпадение
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Рекомендации под настроенное настроение (скрывается сам, если mood пуст) */}
        <BookRecommendations mood={userMood} excludeSlug={bookSlug} />
      </div>
    </section>
  );
}
