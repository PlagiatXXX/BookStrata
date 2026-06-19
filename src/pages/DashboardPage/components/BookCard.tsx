import { memo } from "react";
import { BookOpen, Eye } from "lucide-react";
import type { MyBook } from "@/lib/userApi";

export interface BookCardProps {
  book: MyBook;
  onView: (book: MyBook) => void;
}

export const BookCard = memo(({ book, onView }: BookCardProps) => {
  return (
    <article className="dashboard-card !p-1.5 group relative">
      {/* Cover */}
      <button
        type="button"
        onClick={() => onView(book)}
        className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-[#1e1e1e] cursor-pointer block"
        aria-label={`Просмотреть: ${book.title}`}
      >
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen size={14} className="text-[#4a5568]" />
          </div>
        )}

        {/* Eye icon overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/50">
          <div className="scale-0 rounded-full bg-[#c1fffe] p-1.5 text-black opacity-0 shadow-lg transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
            <Eye size={12} />
          </div>
        </div>
      </button>

      {/* Title */}
      <h3
        className="mt-1 text-[10px] font-medium text-[#f6f1e8] line-clamp-2 leading-tight"
        title={book.title}
      >
        {book.title}
      </h3>

      {/* Author */}
      {book.author && (
        <p className="text-[9px] text-[#94a3b8] mt-0.5 line-clamp-1">
          {book.author}
        </p>
      )}

      {/* Tier list reference */}
      <p className="mt-0.5 text-[9px] text-[#60a5fa] truncate">
        {book.tierListTitle}
      </p>
    </article>
  );
});
