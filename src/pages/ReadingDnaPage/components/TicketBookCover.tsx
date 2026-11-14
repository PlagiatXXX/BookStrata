import { BookOpen, Skull } from "lucide-react";
import type { DnaBookItemData } from "@/lib/readingDnaApi";

export interface TicketBookCoverProps {
  book: DnaBookItemData;
  isDark?: boolean;
  isKryptonite?: boolean;
  className?: string;
}

export function TicketBookCover({
  book,
  isDark = true,
  isKryptonite = false,
  className = "",
}: TicketBookCoverProps) {
  const hasCover = Boolean(book.coverImageUrl);

  return (
    <div
      className={`relative flex flex-col items-center group transition-transform hover:scale-105 duration-200 ${className}`}
      title={`${book.title}${book.author ? ` — ${book.author}` : ""}`}
    >
      {/* 2:3 пропорция книги */}
      <div
        className={`relative w-14 h-20 sm:w-16 sm:h-24 rounded-md overflow-hidden border shadow-md flex flex-col justify-between p-1 select-none transition-all ${
          isKryptonite
            ? isDark
              ? "bg-rose-950/60 border-rose-500/50 shadow-rose-950/40"
              : "bg-rose-100 border-rose-400 shadow-rose-200/50"
            : isDark
              ? "bg-[#141b2a] border-amber-500/40 shadow-black/60"
              : "bg-[#f5eedc] border-stone-400 shadow-stone-300"
        }`}
      >
        {hasCover ? (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          /* Стилизованный переплёт-заглушка */
          <>
            {/* Тисненая золотая/медная рамка */}
            <div
              className={`absolute inset-0.5 border rounded-sm pointer-events-none ${
                isKryptonite
                  ? "border-rose-400/30"
                  : isDark
                    ? "border-amber-400/30"
                    : "border-stone-500/30"
              }`}
            />

            {/* Иконка вверху */}
            <div className="relative z-10 flex justify-center pt-0.5">
              {isKryptonite ? (
                <Skull
                  size={12}
                  className={isDark ? "text-rose-400" : "text-rose-600"}
                />
              ) : (
                <BookOpen
                  size={12}
                  className={isDark ? "text-amber-400" : "text-amber-800"}
                />
              )}
            </div>

            {/* Название книги в центре */}
            <div className="relative z-10 text-center px-0.5 my-auto">
              <span
                className={`block font-serif text-[8px] sm:text-[9px] leading-tight line-clamp-3 font-bold ${
                  isKryptonite
                    ? isDark
                      ? "text-rose-300"
                      : "text-rose-900"
                    : isDark
                      ? "text-amber-200"
                      : "text-stone-900"
                }`}
              >
                {book.title}
              </span>
            </div>

            {/* Автор внизу */}
            {book.author && (
              <div className="relative z-10 text-center pb-0.5">
                <span className="block text-[7px] font-sans opacity-70 truncate px-0.5">
                  {book.author}
                </span>
              </div>
            )}
          </>
        )}

        {/* Бейдж криптонита */}
        {isKryptonite && (
          <div
            data-testid="kryptonite-badge"
            className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] shadow-xs"
            title="Книга-криптонит"
          >
            ☠
          </div>
        )}
      </div>

      {/* Подпись под книгой */}
      {hasCover ? (
        <div className="mt-1 text-center max-w-[70px] sm:max-w-[80px]">
          <div
            className={`font-serif text-[10px] sm:text-[11px] font-semibold truncate ${
              isKryptonite ? "line-through opacity-70 text-rose-400" : ""
            }`}
          >
            {book.title}
          </div>
          {book.author && (
            <div className="text-[9px] opacity-60 truncate">{book.author}</div>
          )}
        </div>
      ) : (
        book.author && (
          <div className="mt-0.5 text-center max-w-[70px] sm:max-w-[80px]">
            <div className="text-[9px] opacity-60 truncate">{book.author}</div>
          </div>
        )
      )}
    </div>
  );
}
