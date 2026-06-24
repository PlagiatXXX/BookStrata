import { memo } from "react";
import type { Tier, Book } from "@/types";

interface CuratedTierViewProps {
  tiers: Record<string, Tier>;
  tierOrder: string[];
  books: Record<string, Book>;
}

export const CuratedTierView = memo(({ tiers, tierOrder, books }: CuratedTierViewProps) => {
  return (
    <div className="flex flex-col gap-1">
      {tierOrder.map((tierId) => {
        const tier = tiers[tierId];
        if (!tier) return null;

        const tierBooks = tier.bookIds
          .map((bookId) => books[bookId])
          .filter(Boolean);

        return (
          <div key={tier.id} className="flex items-stretch gap-1">
            <div
              className="flex items-center justify-center shrink-0 font-bold text-white"
              style={{
                width: 56,
                minHeight: 80,
                backgroundColor: tier.color,
                fontSize: 14,
                lineHeight: 1,
                letterSpacing: "0.05em",
                borderRadius: 6,
              }}
            >
              {tier.title}
            </div>
            <div className="flex items-center gap-[3px] flex-wrap min-h-[80px] flex-1">
              {tierBooks.map((book) => (
                <div
                  key={`${tier.id}-${book.id}`}
                  className="rounded-[4px] border border-black/10 overflow-hidden shrink-0"
                  style={{ width: 80, aspectRatio: "2/3" }}
                  title={`${book.title}${book.author ? ` — ${book.author}` : ""}`}
                >
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = '/images/books/placeholder.svg' }}
                  />
                </div>
              ))}
              {tierBooks.length === 0 && (
                <div className="flex items-center justify-center h-20 w-full text-sm text-(--ink-2) italic">
                  Нет книг
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

CuratedTierView.displayName = "CuratedTierView";
