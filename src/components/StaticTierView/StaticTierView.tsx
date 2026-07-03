import { memo } from "react";
import type { Tier, Book } from "@/types";
import type { ReadStatus } from "@/hooks/useReadStatus";
import { TierLabel } from "@/ui/TierLabel";
import { BookCover } from "@/ui/BookCover";
import "./StaticTierView.css";

interface StaticTierViewProps {
  tiers: Record<string, Tier>;
  tierOrder: string[];
  books: Record<string, Book>;
  onViewBook?: (book: Book) => void;
  filterGenre?: string | null;
  statuses?: Record<string, ReadStatus>;
  onToggleStatus?: (bookId: string) => void;
  unrankedBookIds?: string[];
}

function matchesGenre(book: Book, genre: string | null | undefined): boolean {
  if (!genre) return true;
  if (!book.genre) return false;
  return book.genre.toLowerCase() === genre.toLowerCase();
}

export const StaticTierView = memo(({
  tiers,
  tierOrder,
  books,
  onViewBook,
  filterGenre,
  statuses,
  onToggleStatus,
  unrankedBookIds,
}: StaticTierViewProps) => {
  const unrankedBooks = unrankedBookIds
    ?.map((bookId) => books[bookId])
    .filter(Boolean)
    .filter((book) => matchesGenre(book, filterGenre)) ?? [];

  return (
    <div className="static-tier-view">
      <div className="flex flex-col">
        {tierOrder.map((tierId) => {
          const tier = tiers[tierId];
          if (!tier) return null;

          const tierBooks = tier.bookIds
            .map((bookId) => books[bookId])
            .filter(Boolean)
            .filter((book) => matchesGenre(book, filterGenre));

          return (
            <div key={tier.id} className="nb-tier-row group relative flex">
              <TierLabel
                tierId={tier.id}
                title={tier.title}
                color={tier.color}
                labelSize={tier.labelSize}
                labelWeight={tier.labelWeight}
                labelStyle={tier.labelStyle}
                labelColor={tier.labelColor}
              />
              <div className="nb-book-track relative flex flex-1 flex-wrap content-start items-center transition-colors">
                {tierBooks.map((book) => (
                  <BookCover
                    key={book.id}
                    book={book}
                    isDraggable={false}
                    onView={onViewBook}
                    readStatus={statuses?.[book.id] ?? null}
                    onToggleStatus={onToggleStatus ? () => onToggleStatus(book.id) : undefined}
                  />
                ))}
                {tierBooks.length === 0 && (
                  <div className="w-full h-full pointer-events-none" />
                )}
              </div>
            </div>
          );
        })}

        {/* Unranked books section */}
        {unrankedBooks.length > 0 && (
          <div className="nb-tier-row group relative flex">
            <TierLabel
              tierId="__unranked__"
              title="Без уровня"
              color="transparent"
            />
            <div className="nb-book-track relative flex flex-1 flex-wrap content-start items-center transition-colors">
              {unrankedBooks.map((book) => (
                <BookCover
                  key={book.id}
                  book={book}
                  isDraggable={false}
                  onView={onViewBook}
                  readStatus={statuses?.[book.id] ?? null}
                  onToggleStatus={onToggleStatus ? () => onToggleStatus(book.id) : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

StaticTierView.displayName = "StaticTierView";
