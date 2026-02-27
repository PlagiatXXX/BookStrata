import { memo, forwardRef } from "react";
import { X, Edit2 } from "lucide-react";
import type { Book } from "@/types";

interface BookCoverProps {
  book: Book;
  isDraggable?: boolean;
  onDelete?: (bookId: string) => void;
  onEdit?: (book: Book) => void;
  onView?: (book: Book) => void;
}

export const BookCover = memo(
  forwardRef<HTMLDivElement, BookCoverProps>(
    ({ book, isDraggable = true, onDelete, onEdit, onView }, ref) => {
      const cursorClass = isDraggable
        ? "cursor-grab active:cursor-grabbing"
        : "";
      const label = `${book.title} - ${book.author}`;
      const hasActions = Boolean(onDelete || onEdit);

      return (
        <div
          ref={ref}
          style={{ backgroundImage: `url(${book.coverImageUrl})` }}
          className={`group relative aspect-2/3 w-20 overflow-hidden rounded-xl border border-cyan-300/50 bg-cover bg-center bg-no-repeat transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-fuchsia-300/80 hover:shadow-[0_0_18px_rgba(255,0,204,0.35)] focus-within:border-cyan-200 ${cursorClass}`}
          role="img"
          aria-label={label}
          title={label}
          onDoubleClick={() => onView?.(book)}
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-[#060912]/85 to-transparent opacity-95" />

          {hasActions && (
            <div className="pointer-events-none absolute inset-0 border border-cyan-100/15" />
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(book.id);
              }}
              className="absolute right-1 top-1 z-10 flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-lg border border-fuchsia-300/70 bg-fuchsia-500 px-1 text-[#05070e] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-cyan-200"
              title={`Удалить "${book.title}"`}
            >
              <X size={12} />
            </button>
          )}

          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(book);
              }}
              className="absolute bottom-1 right-1 z-10 flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-lg border border-cyan-200/80 bg-cyan-300 px-1 text-[#05070e] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-fuchsia-200"
              title={`Редактировать "${book.title}"`}
            >
              <Edit2 size={12} />
            </button>
          )}
        </div>
      );
    },
  ),
);

BookCover.displayName = "BookCover";
