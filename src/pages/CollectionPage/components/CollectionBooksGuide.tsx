import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, Heart, ArrowRight } from "lucide-react";
import type { Tier, Book } from "@/types";
import type { ShelfStatus } from "@/lib/shelfApi";
import { proxyImageUrl } from "@/utils/imageProxy";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder/BookCoverPlaceholder";

const TIER_CRITERIA_MAP: Record<string, string> = {
  шедевр: "Эталоны жанра, определившие литературу — обязательно к прочтению",
  отлично: "Выдающиеся книги с глубоким миром и сильным сюжетом практически без слабых мест",
  хорошо: "Крепкие захватывающие истории на несколько вечеров с яркими фишками",
  средне: "Книги на любителя — под специфическое настроение или для фанатов отдельных тропов",
  "на любителя": "Специфические книги с необычными акцентами, которые подойдут не всем",
  "must read": "Главные книги направления, мимо которых нельзя пройти",
};

export interface CollectionBooksGuideProps {
  tiers: Record<string, Tier>;
  tierOrder: string[];
  books: Record<string, Book>;
  shelfStatuses?: Record<string, ShelfStatus>;
  onToggleShelf?: (book: Book, status: ShelfStatus) => void;
  unrankedBookIds?: string[];
}

export const CollectionBooksGuide = memo(function CollectionBooksGuide({
  tiers,
  tierOrder,
  books,
  shelfStatuses = {},
  onToggleShelf,
  unrankedBookIds,
}: CollectionBooksGuideProps) {
  // Подготовка группированных данных: tier -> книги
  const groupedSections = useMemo(() => {
    const result: Array<{
      tierId: string;
      tierTitle: string;
      tierColor: string;
      tierDescription?: string;
      tierBooks: Book[];
    }> = [];

    for (const tierId of tierOrder) {
      const tier = tiers[tierId];
      if (!tier) continue;

      const tierBooks = tier.bookIds
        .map((id) => books[id])
        .filter((b): b is Book => Boolean(b));

      if (tierBooks.length > 0) {
        result.push({
          tierId: tier.id,
          tierTitle: tier.title,
          tierColor: tier.color || "#f59e0b",
          tierDescription: tier.description,
          tierBooks,
        });
      }
    }

    if (unrankedBookIds && unrankedBookIds.length > 0) {
      const unranked = unrankedBookIds
        .map((id) => books[id])
        .filter((b): b is Book => Boolean(b));

      if (unranked.length > 0) {
        result.push({
          tierId: "__unranked__",
          tierTitle: "Кандидаты в рейтинг",
          tierColor: "#64748b",
          tierBooks: unranked,
        });
      }
    }

    return result;
  }, [tiers, tierOrder, books, unrankedBookIds]);

  const totalBooksCount = useMemo(() => {
    return groupedSections.reduce((acc, sec) => acc + sec.tierBooks.length, 0);
  }, [groupedSections]);

  if (totalBooksCount === 0) return null;

  return (
    <section
      className="collection-books-guide mb-14 pt-4 border-t border-white/10"
      aria-labelledby="books-guide-heading"
    >
      {/* Заголовок секции */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 mb-2">
            <BookOpen size={13} />
            Читательский разбор
          </div>
          <h2
            id="books-guide-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-[#dfe2f1]"
            style={{ fontFamily: "'Newsreader', serif" }}
          >
            Гид по книгам рейтинга
          </h2>
          <p className="text-sm sm:text-base text-white/60 mt-1 max-w-2xl leading-relaxed">
            Книги рейтинга с аннотациями, распределением по уровням и быстрым сохранением в свой список чтения.
          </p>
        </div>
        <span className="text-xs font-mono uppercase tracking-widest text-white/40 self-start sm:self-auto">
          {totalBooksCount} книг в списке
        </span>
      </div>

      {/* Секции по тирам */}
      <div className="space-y-10">
        {groupedSections.map((section) => {
          const lowerTitle = section.tierTitle.toLowerCase().trim();
          const tierCriteria = section.tierDescription || TIER_CRITERIA_MAP[lowerTitle];

          return (
            <div key={section.tierId} className="space-y-4">
              {/* Разделитель уровня */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="px-3 py-1 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm text-black"
                    style={{ backgroundColor: section.tierColor }}
                  >
                    {section.tierTitle}
                  </span>
                  <div className="h-px w-6 sm:w-12 bg-white/20 sm:hidden" />
                </div>
                {tierCriteria && (
                  <span className="text-xs sm:text-sm text-white/50 italic">
                    — {tierCriteria}
                  </span>
                )}
                <div className="hidden sm:block h-px flex-1 bg-white/10" />
              </div>

            {/* Карточки книг этого уровня */}
            <div className="grid grid-cols-1 gap-4">
              {section.tierBooks.map((book) => {
                const currentStatus = shelfStatuses[book.id];
                const isWantToRead = currentStatus === "want_to_read";
                const isRead = currentStatus === "read";
                const bookUrl = book.slug ? `/books/${book.slug}` : null;

                return (
                  <article
                    key={book.id}
                    className="group relative bg-[#171b26]/70 hover:bg-[#171b26] border border-white/10 hover:border-[#f59e0b]/30 rounded-2xl p-4 sm:p-6 transition-all duration-300 shadow-lg flex flex-col sm:flex-row gap-5 items-start"
                  >
                    {/* Обложка */}
                    <div className="shrink-0 w-24 sm:w-28 aspect-[2/3] rounded-lg overflow-hidden bg-black/40 border border-white/10 shadow-md relative group-hover:scale-[1.02] transition-transform">
                      {book.coverImageUrl ? (
                        <img
                          src={proxyImageUrl(book.coverImageUrl, 300)}
                          alt={`Обложка: ${book.title}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <BookCoverPlaceholder compact />
                      )}
                      {bookUrl && (
                        <Link
                          to={bookUrl}
                          className="absolute inset-0 z-10"
                          aria-label={`Открыть страницу книги ${book.title}`}
                        />
                      )}
                    </div>

                    {/* Текстовая колонка */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-3">
                      <div>
                        {/* Жанр и бейдж уровня */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: `${section.tierColor}20`,
                              color: section.tierColor,
                              border: `1px solid ${section.tierColor}40`,
                            }}
                          >
                            {section.tierTitle}
                          </span>
                          {book.genre && (
                            <span className="text-xs text-white/40 tracking-wider">
                              • {book.genre}
                            </span>
                          )}
                        </div>

                        {/* Название и автор */}
                        <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-[#f59e0b] transition-colors leading-snug">
                          {bookUrl ? (
                            <Link to={bookUrl} className="hover:underline">
                              {book.title}
                            </Link>
                          ) : (
                            book.title
                          )}
                        </h3>
                        {book.author && (
                          <p className="text-sm font-medium text-white/70 mt-0.5">
                            {book.authorSlug ? (
                              <Link
                                to={`/authors/${book.authorSlug}`}
                                className="hover:text-[#f59e0b] hover:underline transition-colors"
                              >
                                {book.author}
                              </Link>
                            ) : (
                              book.author
                            )}
                          </p>
                        )}

                        {/* Аннотация / разбор */}
                        {book.description ? (
                          <p className="text-sm sm:text-[15px] text-white/80 leading-relaxed mt-2.5 line-clamp-3 sm:line-clamp-none">
                            {book.description}
                          </p>
                        ) : (
                          <p className="text-xs italic text-white/40 mt-2.5">
                            Описание подготавливается редакцией.
                          </p>
                        )}
                      </div>

                      {/* Панель быстрых действий */}
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        {onToggleShelf && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleShelf(
                                book,
                                isWantToRead ? "read" : "want_to_read",
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isWantToRead
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                : isRead
                                  ? "bg-green-500/20 text-green-300 border border-green-500/40"
                                  : "bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 hover:border-white/30"
                            }`}
                          >
                            {isRead ? (
                              <>
                                <Check size={14} className="text-green-400" />
                                <span>Прочитал</span>
                              </>
                            ) : isWantToRead ? (
                              <>
                                <Heart
                                  size={14}
                                  className="text-cyan-400"
                                  fill="currentColor"
                                />
                                <span>В планах</span>
                              </>
                            ) : (
                              <>
                                <Heart size={14} className="text-white/60" />
                                <span>Хочу прочитать</span>
                              </>
                            )}
                          </button>
                        )}

                        {bookUrl && (
                          <Link
                            to={bookUrl}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#f59e0b] hover:text-[#ffc174] transition-colors ml-auto sm:ml-0"
                          >
                            <span>Подробнее</span>
                            <ArrowRight size={13} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
    </section>
  );
});
