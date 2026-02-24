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

export const SortableBookCover = memo(({
  book,
  containerId,
  onDelete,
  onEdit,
  onView,
}: SortableBookCoverProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: book.id, data: { type: "book", containerId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="transition-transform duration-150"
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
    </div>
  );
});
