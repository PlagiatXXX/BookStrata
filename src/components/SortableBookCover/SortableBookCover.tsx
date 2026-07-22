import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookCover } from "@/ui/BookCover";
import type { Book } from "@/types";

interface SortableBookCoverProps {
  book: Book;
  containerId: string;
  onDelete?: (bookId: string) => void;
  onEdit?: (book: Book) => void;
  onView?: (book: Book) => void;
}

export const SortableBookCover = memo(
  ({ book, containerId, onDelete, onEdit, onView }: SortableBookCoverProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
      useSortable({ id: `book-${book.id}`, data: { type: "book", containerId, book } });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative cursor-grab active:cursor-grabbing touch-none select-none"
        {...attributes}
        {...listeners}
      >
        <BookCover
          book={book}
          onDelete={onDelete}
          onEdit={onEdit}
          onView={onView}
          isDraggable={false}
        />
        {isOver && !isDragging && (
          <div
            className="absolute inset-0 pointer-events-none nb-book-insert-before"
            aria-hidden="true"
          />
        )}
      </div>
    );
  },
);

SortableBookCover.displayName = "SortableBookCover";
