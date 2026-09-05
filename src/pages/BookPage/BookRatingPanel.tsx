// src/pages/BookPage/BookRatingPanel.tsx
// «Оценить книгу»: слайдер 0–10 (шаг 0.1), дефолт — редакционная оценка,
// одна оценка на пользователя (upsert), память в localStorage, среднее читателей.
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { useBookRatings, useMyBookRating, useRateBook } from "@/hooks/useBookRating";
import { Icon } from "@/components/Icon";

interface BookRatingPanelProps {
  bookId: number;
  /** Рейтинг каталога (редакционный) — стартовое значение слайдера */
  defaultRating: number | null;
}

const LS_PREFIX = "book-rating:";

function readLocalRating(bookId: number): number | null {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${bookId}`);
    const value = raw === null ? null : Number(raw);
    return value !== null && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function BookRatingPanel({ bookId, defaultRating }: BookRatingPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAuthed = Boolean(user);

  const ratingsQuery = useBookRatings(bookId);
  const myQuery = useMyBookRating(bookId, isAuthed);
  const rateMutation = useRateBook(bookId);

  const myValue = myQuery.data?.ratings?.overall ?? null;
  const localValue = readLocalRating(bookId);

  // Стартовое значение: моя оценка из БД > localStorage > редакционная > 5
  const [value, setValue] = useState<number>(() => localValue ?? defaultRating ?? 5);

  // Когда подгрузилась моя оценка из БД — она приоритетнее localStorage.
  // Паттерн «adjust state during render» (react.dev/learn/you-might-not-need-an-effect)
  // вместо useEffect: без каскадных ре-рендеров.
  const [prevMyValue, setPrevMyValue] = useState(myValue);
  if (myValue !== null && myValue !== prevMyValue) {
    setPrevMyValue(myValue);
    setValue(myValue);
  }

  const average = ratingsQuery.data?.overall ?? null;
  const votes = ratingsQuery.data?.count ?? 0;
  const hasVoted = isAuthed && (myValue !== null || localValue !== null);

  const handleSubmit = () => {
    if (!isAuthed) {
      // Вернуть на ту же страницу после входа
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    try {
      localStorage.setItem(`${LS_PREFIX}${bookId}`, String(value));
    } catch {
      // localStorage недоступен — оценка всё равно уйдёт в БД
    }
    rateMutation.mutate(value);
  };

  return (
    <div className="mb-8">
      <h3 className="bp-label-caps text-white/80 tracking-widest mb-4">Оценить книгу</h3>

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-white/60">Ваша оценка</span>
        <span className="text-3xl font-bold text-[var(--bp-primary)] drop-shadow-md">{value.toFixed(1)}</span>
      </div>

      <input
        type="range"
        min={0}
        max={10}
        step={0.1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label="Оценка книги от 0 до 10"
        className="w-full accent-[var(--bp-primary)] mb-4"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={rateMutation.isPending}
        aria-disabled={!isAuthed}
        className={`w-full h-11 whitespace-nowrap bp-label-caps px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
          isAuthed
            ? "bg-[var(--bp-primary)] hover:bg-[var(--bp-primary-container)] text-[var(--bp-on-primary)] shadow-[0_0_20px_rgba(255,183,135,0.3)] hover:shadow-[0_0_30px_rgba(255,183,135,0.5)]"
            : "bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
        }`}
      >
        {!isAuthed && (
          <Icon name="lock" className="text-sm" />
        )}
        {rateMutation.isPending
          ? "Сохраняем..."
          : isAuthed
            ? hasVoted
              ? "Изменить оценку"
              : "Поставить оценку"
            : "Сначала войти"}
      </button>

      {average !== null && votes > 0 && (
        <p className="mt-4 text-sm text-white/70">
          Средняя оценка:{" "}
          <span className="text-white font-semibold">{average.toFixed(1)}</span>
          <span className="text-white/50">
            {" "}· {votes} {votes === 1 ? "голос" : votes < 5 ? "голоса" : "голосов"}
          </span>
        </p>
      )}
    </div>
  );
}