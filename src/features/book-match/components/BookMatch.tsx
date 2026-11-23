// src/features/book-match/components/BookMatch.tsx
// BookMatch — контейнер: заголовок + слайдеры + результат.
// Поддерживает режимы ДНК пользователя, оверрайд под текущее настроение и песочницу гостя с CTA.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDnaDraftStorageKey } from "@/pages/ReadingDnaPage/utils/dnaStorage";
import { BookMatchSlider } from "./BookMatchSlider";
import { BookMatchResult } from "./BookMatchResult";
import { BookRecommendations } from "./BookRecommendations";
import { DnaSignalsList } from "./DnaSignalsList";
import { Icon } from "@/components/Icon";
import type { MatchAxis, SliderAxis, ReadingProfile, UserMood } from "../domain/types";
import { matchScore } from "../domain/matchScore";
import { genreSimilarity } from "../domain/genreSimilarity";
import { matchLevel } from "../domain/matchLevel";
import { explainMatch } from "../domain/explainMatch";
import { detectDnaSignals } from "../domain/dnaSignals";
import { useStoredMood } from "../hooks/useStoredMood";
import { useAuth } from "@/hooks/useAuthContext";
import { useMyReadingDna } from "@/hooks/useMyReadingDna";
import type { DnaAxesData } from "@/lib/readingDnaApi";
import {
  useGenrePreferences,
  useSetGenrePreferences,
} from "@/hooks/useGenrePreferences";
import { GENRE_CATEGORIES, type CategoryId } from "@/data/genre-taxonomy";

interface BookMatchProps {
  book: ReadingProfile;
  bookTitle: string;
  bookAuthor?: string | null;
  bookId?: number;
  /** Slug текущей книги — исключить её из рекомендаций. */
  bookSlug?: string;
  /** Жанр и теги книги — вход для 7-й оси (genreSimilarity). */
  bookGenre?: string | null;
  bookTags?: string[];
}

const AXES: SliderAxis[] = ["storyFocus", "emotionalWeight", "pace", "darkness", "scope", "complexity"];

export function BookMatch({
  book,
  bookTitle,
  bookAuthor,
  bookId,
  bookSlug,
  bookGenre,
  bookTags,
}: BookMatchProps) {
  const navigate = useNavigate();

  // Персональный ДНК пользователя (если есть сохранённый билет)
  const { dna } = useMyReadingDna();

  // Режим оверрайда (отклонение от ДНК под текущее настроение)
  const [isOverridden, setIsOverridden] = useState(false);
  const [overrideMood, setOverrideMood] = useState<UserMood>({});

  // Mood гостя персистентен: init из localStorage, изменения перезаписывают,
  // сброс удаляет (см. useStoredMood)
  const { mood: userMood, updateMood, resetMood } = useStoredMood();

  // 7-я ось: жанры профиля. Блок виден только залогиненным с выбранными
  // жанрами; тумблер исключает их из расчёта на этот раз (не сохраняется).
  const { isAuthenticated, user } = useAuth();
  const { data: selectedGenres = [] } = useGenrePreferences();
  const setPreferences = useSetGenrePreferences();
  const [useGenresInMatch, setUseGenresInMatch] = useState(false);

  // Вычисляем сигналы соответствия книги с Книжным ДНК читателя
  const signals = useMemo(
    () =>
      detectDnaSignals(
        {
          title: bookTitle,
          author: bookAuthor,
          genre: bookGenre,
          tags: bookTags,
          id: bookId,
        },
        dna,
      ),
    [bookTitle, bookAuthor, bookGenre, bookTags, bookId, dna],
  );

  // Определение эффективного настроения
  const currentMood: UserMood = dna
    ? isOverridden
      ? overrideMood
      : dna.axes
    : userMood;

  const showGenreBlock = isAuthenticated && selectedGenres.length > 0;
  const genresForMatch =
    showGenreBlock && useGenresInMatch ? selectedGenres : undefined;

  const removeGenre = (id: CategoryId) => {
    setPreferences.mutate(selectedGenres.filter((g) => g !== id));
  };

  const handleSliderChange = (axis: MatchAxis, value: number) => {
    if (dna) {
      setOverrideMood((prev) => ({ ...prev, [axis]: value }));
    } else {
      updateMood({ ...userMood, [axis]: value });
    }
  };

  const handleReset = () => {
    if (dna) {
      setIsOverridden(false);
      setOverrideMood({});
    } else {
      resetMood();
    }
  };

  const handleCreateDnaCta = () => {
    try {
      const draftAxes: DnaAxesData = {
        storyFocus: userMood.storyFocus ?? 50,
        emotionalWeight: userMood.emotionalWeight ?? 50,
        pace: userMood.pace ?? 50,
        darkness: userMood.darkness ?? 50,
        scope: userMood.scope ?? 50,
        complexity: userMood.complexity ?? 50,
      };
      const touchedAxes: Record<string, boolean> = {};
      for (const axis of AXES) {
        if (typeof userMood[axis] === "number") {
          touchedAxes[axis] = true;
        }
      }
      const firstUntouchedIndex = AXES.findIndex((axis) => !touchedAxes[axis]);
      const nextStep = firstUntouchedIndex === -1 ? 6 : firstUntouchedIndex;
      const draftKey = getDnaDraftStorageKey(user?.userId);

      localStorage.setItem(
        draftKey,
        JSON.stringify({
          step: nextStep,
          axes: draftAxes,
          favoriteBooks: [null, null, null],
          kryptonite: null,
          touchedAxes,
        }),
      );
    } catch {
      // Игнорируем недоступность localStorage в приватном режиме
    }
    navigate("/reading-dna?tab=test");
  };

  // Вычисляем результат
  const activeAxesCount = Object.values(currentMood).filter(
    (v): v is number => typeof v === "number",
  ).length;

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
    const score = matchScore(currentMood, book, genreSim);
    const level = matchLevel(score);
    const explanation = explainMatch(currentMood, book);
    return { score, level, activeAxesCount, ...explanation };
  }, [
    currentMood,
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
      id="book-match"
      className="relative py-12 border-t border-primary/20"
      aria-label="Подбор книги по настроению и ДНК"
    >
      <div className="max-w-275 mx-auto px-4 md:px-5">
        {/* Заголовок */}
        <div className="mb-8 text-center">
          <h2 className="bp-display text-white tracking-[0.2em] uppercase text-xl md:text-2xl mb-2">
            Тебе зайдёт эта книга?
          </h2>
          <p className="text-sm text-white/70">
            {dna
              ? `Расчёт на основе твоего персонального билета (${dna.archetypeName})`
              : "Настрой чтение под себя один раз и данные сохранятся"}
          </p>
          <div className="w-40 h-px bg-(--bp-primary) mx-auto mt-3" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Слайдеры или свернутая карточка ДНК */}
          {dna && !isOverridden ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col items-center justify-center text-center min-h-55 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">
                  Расчёт выполнен по твоему Книжному ДНК
                </p>
                <p className="text-xs text-white/60 max-w-sm">
                  Используются постоянные оси твоего архетипа ({dna.archetypeName}). Ты можешь временно скорректировать их для разового подбора книги.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOverridden(true);
                  setOverrideMood({ ...dna.axes });
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <Icon name="tune" className="text-sm" />
                <span>Настроить под настроение сейчас</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {dna && isOverridden && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200">
                  <span>Режим текущего настроения (отклонение от твоего ДНК)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverridden(false);
                      setOverrideMood({});
                    }}
                    className="font-semibold text-white hover:text-amber-300 transition-colors cursor-pointer underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 rounded"
                  >
                    Вернуть мой ДНК
                  </button>
                </div>
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {dna && isOverridden ? "Текущие ожидания" : "Ваши ожидания"}
              </p>
              {AXES.map((axis) => (
                <BookMatchSlider
                  key={axis}
                  axis={axis}
                  value={currentMood[axis]}
                  onChange={handleSliderChange}
                />
              ))}

              {/* Индикатор настроенных параметров */}
              {activeAxesCount > 0 && activeAxesCount < 6 && (
                <p className="text-center text-xs text-white/60 mt-4">
                  {activeAxesCount} из 6 параметров настроены
                </p>
              )}
            </div>
          )}

          {/* Результат */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Совместимость с {bookTitle}
              </p>
              {dna && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-(--bp-primary)/20 text-white border border-(--bp-primary)/40">
                  {dna.archetypeName}
                </span>
              )}
            </div>

            {dna && !isOverridden && <DnaSignalsList signals={signals} />}

            <div className="mt-4">
              {result ? (
                <BookMatchResult
                  result={result}
                  onReset={handleReset}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-50 text-center">
                  <div className="text-4xl font-bold text-white/20 mb-2">—</div>
                  <p className="text-xs text-white/60">
                    Настрой хотя бы одну шкалу, чтобы увидеть совпадение
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Жанры профиля: чипы выбранных (клик снимает) + тумблер учёта */}
        {showGenreBlock && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Мои жанры
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-white/80 select-none">
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
                  className="cursor-pointer rounded-full border border-amber-400/50 bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200 transition-all hover:border-amber-300 hover:bg-amber-400/30 hover:shadow-[0_0_10px_rgba(251,191,36,0.3)]"
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
          mood={currentMood}
          excludeSlug={bookSlug}
          genres={genresForMatch}
        />

        {/* CTA для гостя без сохранённого ДНК, когда настроена хотя бы 1 шкала */}
        {!dna && activeAxesCount > 0 && (
          <div
            data-testid="dna-cta-card"
            className="mt-8 rounded-2xl border border-(--bp-primary)/30 bg-linear-to-r from-(--bp-primary)/10 via-white/5 to-transparent p-6 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-base font-semibold text-white">
                Хочешь узнавать совместимость со всеми книгами автоматически?
              </h3>
              <p className="text-sm text-white/70">
                Создай свой Книжный ДНК за 2 минуты
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateDnaCta}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-(--bp-primary) text-white font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-lg shadow-(--bp-primary)/20 active:scale-95"
            >
              Создать Книжный ДНК
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
