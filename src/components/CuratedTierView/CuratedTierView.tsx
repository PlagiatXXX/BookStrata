import { memo } from "react";
import type { Tier, Book } from "@/types";
import { TierLabel } from "@/ui/TierLabel";
import { BookCover } from "@/ui/BookCover";

interface CuratedTierViewProps {
  tiers: Record<string, Tier>;
  tierOrder: string[];
  books: Record<string, Book>;
  onViewBook?: (book: Book) => void;
}

export const CuratedTierView = memo(({ tiers, tierOrder, books, onViewBook }: CuratedTierViewProps) => {
  return (
    <div className="neo-brutalist-editor">
      <div className="flex flex-col">
        {tierOrder.map((tierId) => {
          const tier = tiers[tierId];
          if (!tier) return null;

          const tierBooks = tier.bookIds
            .map((bookId) => books[bookId])
            .filter(Boolean);

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
                  />
                ))}
                {tierBooks.length === 0 && (
                  <div className="w-full h-full pointer-events-none" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

CuratedTierView.displayName = "CuratedTierView";
