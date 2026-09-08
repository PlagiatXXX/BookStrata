// src/features/book-match/components/BookRecommendations.tsx
// Карточки рекомендаций под слайдерами Book Match.
// Рендерится только при активном mood и успешном ответе с книгами.

import { Link } from "react-router-dom";
import { useMatchedBooks } from "../hooks/useMatchedBooks";
import { matchLevel } from "../domain/matchLevel";
import type { MoodParams } from "@/lib/matchApi";

interface BookRecommendationsProps {
  mood: MoodParams;
  /** Slug текущей книги — исключаем из рекомендаций. */
  excludeSlug?: string;
}

/** Цвет уровня → Tailwind класс (как в BookMatchResult). */
function levelColor(color: "emerald" | "amber" | "rose"): string {
  if (color === "emerald") return "text-emerald-400";
  if (color === "amber") return "text-amber-400";
  return "text-rose-400";
}

export function BookRecommendations({ mood, excludeSlug }: BookRecommendationsProps) {
  const hasMood = Object.values(mood).some((v) => v !== undefined);
  const { data: books, isPending, isError } = useMatchedBooks(mood, { excludeSlug });

  // Нет настроения / ошибка — блок скрыт целиком
  if (!hasMood || isError) return null;

  // Успешный, но пустой ответ — тоже прячем (нечего показать)
  if (!isPending && (!books || books.length === 0)) return null;

  return (
    <div className="mt-10">
      <div className="mb-4 text-center">
        <h3 className="bp-display text-white tracking-[0.2em] uppercase text-sm md:text-base mb-1">
          Идеально под твоё настроение
        </h3>
        <p className="text-xs text-white/40">Книги каталога с самым высоким совпадением</p>
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              data-testid="rec-skeleton"
              className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {books!.map((book) => {
            const level = matchLevel(book.score);
            return (
              <Link
                key={book.id}
                to={`/books/${book.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors duration-200 hover:border-white/25 hover:bg-white/10"
              >
                <img
                  src={book.coverImageUrl}
                  alt={book.title}
                  loading="lazy"
                  className="h-[72px] w-12 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-(--bp-primary)">
                    {book.title}
                  </p>
                  <p className="truncate text-xs text-white/40">{book.author}</p>
                  <span
                    className={`mt-1 block text-lg font-bold tabular-nums ${levelColor(level.color)}`}
                  >
                    {book.score}%
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
