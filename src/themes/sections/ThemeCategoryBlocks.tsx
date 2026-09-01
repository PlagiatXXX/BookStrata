import type { Tier, Book } from "@/types";
import { proxyImageUrl } from "@/utils/imageProxy";

interface ThemeCategoryBlocksProps {
  tiers: Record<string, Tier>;
  tierOrder: string[];
  books: Record<string, Book>;
}

export function ThemeCategoryBlocks({
  tiers,
  tierOrder,
  books,
}: ThemeCategoryBlocksProps) {
  return (
    <div className="flex flex-col gap-12">
      {tierOrder.map((tierId) => {
        const tier = tiers[tierId];
        if (!tier) return null;

        return (
          <div key={tierId} className="flex flex-col md:flex-row gap-6">
            {/* Category header block */}
            <div
              className="md:w-48 flex-shrink-0 flex items-center justify-center p-4 rounded-lg text-white"
              style={{ background: tier.color }}
            >
              <h3
                className="text-lg font-bold text-center"
                style={{ fontFamily: "var(--theme-font-headline)" }}
              >
                {tier.title}
              </h3>
            </div>

            {/* Book covers grid */}
            <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {tier.bookIds.map((bookId) => {
                const book = books[bookId];
                if (!book) return null;

                const coverSrc = book.coverImageUrl
                  ? proxyImageUrl(book.coverImageUrl)
                  : undefined;

                return (
                  <div key={bookId} className="group cursor-pointer">
                    <div
                      className="relative aspect-[2/3] rounded-lg overflow-hidden transition-transform duration-300 group-hover:-translate-y-1"
                      style={{
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    >
                      {coverSrc ? (
                        <img
                          src={coverSrc}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-sm p-2 text-center"
                          style={{
                            background: "var(--theme-surface-high)",
                            color: "var(--theme-on-surface-variant)",
                            fontFamily: "var(--theme-font-body)",
                          }}
                        >
                          {book.title}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
