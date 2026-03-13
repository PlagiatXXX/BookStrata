import { Book, AlertCircle, CheckCircle2, Crown } from 'lucide-react';
import { MAX_BOOKS_PER_TIER_LIST } from '@/pages/DashboardPage/constants';

interface BookCounterProps {
  booksCount: number;
  isPro?: boolean;
}

export function BookCounter({ booksCount, isPro = false }: BookCounterProps) {
  const maxBooks = isPro ? Infinity : MAX_BOOKS_PER_TIER_LIST;
  const remainingBooks = isPro ? Infinity : Math.max(0, maxBooks - booksCount);
  const isAtLimit = isPro ? false : booksCount >= maxBooks;
  const isNearLimit = isPro ? false : booksCount >= maxBooks - 3;
  const progressPercent = isPro ? 100 : Math.min(100, Math.round((booksCount / maxBooks) * 100));

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book size={18} className="text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">
            Книги в тир-листе
          </span>
          {isPro && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
              <Crown size={12} />
              Pro
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-slate-100">
            {isPro ? '∞' : booksCount}
          </span>
          {!isPro && (
            <span className="text-sm text-slate-500">/ {maxBooks}</span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full transition-all duration-300 ${
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
              ? 'bg-amber-500'
              : isPro
              ? 'bg-amber-400'
              : 'bg-cyan-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Status Message */}
      <div className="mt-2 flex items-center gap-2">
        {isPro ? (
          <>
            <Crown size={14} className="text-amber-400" />
            <span className="text-xs text-amber-400">
              Неограниченное количество книг
            </span>
          </>
        ) : isAtLimit ? (
          <>
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs text-red-400">
              Достигнут лимит книг
            </span>
          </>
        ) : isNearLimit ? (
          <>
            <AlertCircle size={14} className="text-amber-400" />
            <span className="text-xs text-amber-400">
              Осталось {remainingBooks} из {maxBooks}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-xs text-emerald-400">
              Можно добавить ещё {remainingBooks} книг
            </span>
          </>
        )}
      </div>
    </div>
  );
}
