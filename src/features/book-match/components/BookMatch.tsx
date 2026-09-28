// src/features/book-match/components/BookMatch.tsx
// BookMatch — контейнер: заголовок + слайдеры + результат.
// Слайдеры и результат живут одновременно.

import { useMemo, useState } from "react";
import { BookMatchSlider } from "./BookMatchSlider";
import { BookMatchResult } from "./BookMatchResult";
import { BookRecommendations } from "./BookRecommendations";
import type { MatchAxis, SliderAxis, ReadingProfile } from "../domain/types";
import { matchScore } from "../domain/matchScore";
import { genreSimilarity } from "../domain/genreSimilarity";
import { matchLevel } from "../domain/matchLevel";
import { explainMatch } from "../domain/explainMatch";
import { useStoredMood } from "../hooks/useStoredMood";
import { useAuth } from "@/hooks/useAuthContext";
import {
  useGenrePreferences,
  useSetGenrePreferences,
} from "@/hooks/useGenrePreferences";
import { GENRE_CATEGORIES, type CategoryId } from "@/data/genre-taxonomy";

interface BookMatchProps {
  book: ReadingProfile;
  bookTitle: string;
  /** Slug текущей книги — исключить её из рекомендаций. */
  bookSlug?: string;
  /** Жанр и теги книги — вход для 7-й оси (genreSimilarity). */
  bookGenre?: string | null;
  bookTags?: string[];
}

const AXES: SliderAxis[] = ["storyFocus", "emotionalWeight", "pace", "darkness", "scope", "complexity"];

export function BookMatch({ book, bookTitle, bookSlug, bookGenre, bookTags }: BookMatchProps) {
  // Mood персистентен: init из localStorage, изменения перезаписывают,
  // сброс удаляет (см. useStoredMood)
  const { mood: userMood, updateMood, resetMood } = useStoredMood();

  // 7-я ось: жанры профиля. Блок виден только залогиненным с выбранными
  // жанрами; тумблер исключает их из расчёта на этот раз (не сохраняется).
  const { isAuthenticated } = useAuth();
  const { data: selectedGenres = [] } = useGenrePreferences();
  const setPreferences = useSetGenrePreferences();
  const [useGenresInMatch, setUseGenresInMatch] = useState(false);

  const showGenreBlock = isAuthenticated && selectedGenres.length > 0;
  const genresForMatch =
    showGenreBlock && useGenresInMatch ? selectedGenres : undefined;

  const removeGenre = (id: CategoryId) => {
    setPreferences.mutate(selectedGenres.filter((g) => g !== id));
  };

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
    // 7-я ось: жанровая схожесть — только когда тумблер включён (и блок виден)
    const genreSim =
      showGenreBlock && useGenresInMatch
        ? genreSimilarity(selectedGenres, {
            genre: bookGenre ?? null,
            tags: bookTags ?? [],
            genreConfidence: book.genreConfidence,
          })
        : undefined;
    const score = matchScore(userMood, book, genreSim);
    const level = matchLevel(score);
    const explanation = explainMatch(userMood, book);
    return { score, level, activeAxesCount, ...explanation };
  }, [
    userMood,
    book,
    activeAxesCount,
    showGenreBlock,
    useGenresInMatch,
    selectedGenres,
    bookGenre,
    bookTags,
  ]);

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

        {/* Жанры профиля: чипы выбранных (клик снимает) + тумблер учёта */}
        {showGenreBlock && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Мои жанры
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60 select-none">
                <input
                  type="checkbox"
                  checked={useGenresInMatch}
                  onChange={(e) => setUseGenresInMatch(e.target.checked)}
                  className="h-4 w-4 accent-(--bp-primary)"
                />
                Учитывать мои жанры
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => removeGenre(genre)}
                  className="rounded-full border border-(--bp-primary)/60 bg-(--bp-primary)/20 px-3 py-1 text-xs font-medium text-white transition-colors hover:border-(--bp-primary)"
                  title="Убрать из предпочтений"
                >
                  {GENRE_CATEGORIES.find((c) => c.id === genre)?.label ?? genre}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Рекомендации под настроенное настроение (скрывается сам, если mood пуст) */}
        <BookRecommendations
          mood={userMood}
          excludeSlug={bookSlug}
          genres={genresForMatch}
        />
      </div>
    </section>
  );
}
