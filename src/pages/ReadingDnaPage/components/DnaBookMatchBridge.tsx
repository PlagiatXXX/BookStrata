import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, BookOpen, ArrowRight } from "lucide-react";
import { getMatchedBooks, matchedBooksKey } from "@/lib/matchApi";
import { proxyImageUrl } from "@/utils/imageProxy";
import type { DnaAxesData } from "@/lib/readingDnaApi";
import type { DnaTheme } from "../ReadingDnaPage";

interface DnaBookMatchBridgeProps {
  axes: DnaAxesData;
  excludeBookIds?: number[];
  theme: DnaTheme;
  onOpenBukstrazh: () => void;
}

/**
 * Мост из Reading DNA в каталог книг (Book Match) и AI-библиотекаря (Букстраж).
 * Запрашивает топ-3 книги из каталога с максимальным совпадением по 6 осям билета,
 * исключая уже указанные священные книги и книгу-криптонит.
 */
export function DnaBookMatchBridge({
  axes,
  excludeBookIds,
  theme,
  onOpenBukstrazh,
}: DnaBookMatchBridgeProps) {
  const isDark = theme === "dark";

  const moodParams = {
    storyFocus: axes.storyFocus,
    emotionalWeight: axes.emotionalWeight,
    pace: axes.pace,
    darkness: axes.darkness,
    scope: axes.scope,
    complexity: axes.complexity,
  };

  const { data: matchedBooks, isLoading } = useQuery({
    queryKey: matchedBooksKey(moodParams, 3, undefined, undefined, excludeBookIds),
    queryFn: () => getMatchedBooks(moodParams, 3, undefined, undefined, excludeBookIds),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div
      className={`p-3.5 sm:p-5 rounded-xl border space-y-3.5 ${
        isDark
          ? "bg-[#2b1d14]/70 border-[rgba(201,163,91,0.3)] text-[#efe3cc]"
          : "bg-white/85 border-[rgba(59,110,168,0.28)] text-[#2e2a24]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] sm:text-xs uppercase font-mono tracking-wider opacity-60">
            Book Match · По твоему ДНК
          </div>
          <h3 className="text-sm sm:text-base font-bold mt-0.5">
            3 книги с максимальным совпадением
          </h3>
        </div>

        <button
          type="button"
          onClick={onOpenBukstrazh}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            isDark
              ? "bg-[#8a2433] hover:bg-[#a32b3d]"
              : "bg-[#b3412f] hover:bg-[#c94935]"
          }`}
        >
          <Sparkles size={13} />
          <span>Обсудить ДНК с Букстражем</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-current/10 animate-pulse"
            />
          ))}
        </div>
      ) : matchedBooks && matchedBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {matchedBooks.map((book) => (
            <Link
              key={book.id}
              to={`/books/${book.slug}`}
              className={`group flex items-center gap-3 p-2.5 rounded-lg border transition-all hover:-translate-y-0.5 ${
                isDark
                  ? "bg-[#1e130c]/70 border-[rgba(201,163,91,0.22)] hover:border-[rgba(201,163,91,0.55)]"
                  : "bg-[#fbf8f2] border-[rgba(59,110,168,0.22)] hover:border-[rgba(59,110,168,0.55)]"
              }`}
            >
              <div className="w-12 h-18 shrink-0 rounded-md overflow-hidden bg-black/20 flex items-center justify-center">
                {book.coverImageUrl ? (
                  <img
                    src={proxyImageUrl(book.coverImageUrl, 200)}
                    alt={book.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen size={18} className="opacity-40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded mb-1 ${
                    isDark
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-[#b3412f]/10 text-[#b3412f]"
                  }`}
                >
                  {book.score}% совпадение
                </span>
                <div className="text-xs font-bold leading-snug line-clamp-2 group-hover:underline">
                  {book.title}
                </div>
                {book.author && (
                  <div className="text-[11px] opacity-65 truncate mt-0.5">
                    {book.author}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 text-xs opacity-75">
          <span>Откройте каталог, чтобы подобрать книги по настроению и жанрам.</span>
          <Link
            to="/what-to-read"
            className="inline-flex items-center gap-1 font-semibold underline shrink-0"
          >
            <span>Что почитать</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
