import { useMemo } from "react";
import { useBookshelf } from "@/hooks/useBookshelf";
import type { Book } from "@/types";

interface InteractiveShelfBlockProps {
  books: Record<string, Book>;
  shelfFilter?: "all" | "planned";
  onShelfFilterChange?: (filter: "all" | "planned") => void;
}

export function InteractiveShelfBlock({
  books,
  shelfFilter = "all",
  onShelfFilterChange,
}: InteractiveShelfBlockProps) {
  const { slugShelf } = useBookshelf();

  const stats = useMemo(() => {
    const bookList = Object.values(books);
    const totalBooks = bookList.length;
    const markedCount = bookList.filter((book) => book.slug && book.slug in slugShelf).length;
    const plannedCount = bookList.filter((book) => book.slug && slugShelf[book.slug] === "want_to_read").length;

    return { totalBooks, markedCount, plannedCount };
  }, [books, slugShelf]);

  const progressPercent = stats.totalBooks > 0
    ? Math.round((stats.markedCount / stats.totalBooks) * 100)
    : 0;

  return (
    <aside className="collection-glass-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="collection-section-title flex items-center gap-1">
            <span>Интерактивная полка</span>
          </div>
          <span
            className="font-mono text-[0.6875rem] text-[#f59e0b] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(245, 158, 11, 0.1)' }}
          >
            Отмечено: {stats.markedCount} из {stats.totalBooks}
          </span>
        </div>

        <h3
          className="text-lg font-semibold mb-1"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#dfe2f1' }}
        >
          Отмечайте книги в планах
        </h3>

        <p
          className="text-sm mb-4"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#d8c3ad' }}
        >
          Нажимайте на обложку или карточку и добавляйте книги в «Хочу прочитать»,
          чтобы отслеживать свой план чтения.
        </p>

        <div className="collection-progress-track mb-4">
          <div
            className="collection-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 pt-2 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.07)' }}>
        <div className="flex items-center gap-2">
          <button
            className={`collection-filter-chip${shelfFilter === 'all' ? ' collection-filter-chip--active' : ''}`}
            onClick={() => onShelfFilterChange?.('all')}
          >
            Все
          </button>
          <button
            className={`collection-filter-chip${shelfFilter === 'planned' ? ' collection-filter-chip--active' : ''}`}
            onClick={() => onShelfFilterChange?.('planned')}
          >
            В планах ({stats.plannedCount})
          </button>
        </div>
      </div>
    </aside>
  );
}
