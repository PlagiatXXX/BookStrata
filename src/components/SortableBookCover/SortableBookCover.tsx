import { memo } from "react";
import { useDndContext } from "@dnd-kit/core";
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

const DragIndicatorOverlay = memo(({ bookId }: { bookId: string }) => {
  const { active, over } = useDndContext();

  const isBookDrag = active?.data.current?.type === "book";
  const isHoveredDropTarget =
    isBookDrag && over?.id === bookId && active?.id !== bookId;

  if (!isHoveredDropTarget) return null;

  const activeRect = active?.rect.current.translated;
  const overRect = over?.rect;
  const insertAfter =
    activeRect &&
    overRect &&
    activeRect.left + activeRect.width / 2 > overRect.left + overRect.width / 2;

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${
        insertAfter ? "nb-book-insert-after" : "nb-book-insert-before"
      }`}
      aria-hidden="true"
    />
  );
});

DragIndicatorOverlay.displayName = "DragIndicatorOverlay";

export const SortableBookCover = memo(
  ({ book, containerId, onDelete, onEdit, onView }: SortableBookCoverProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id: book.id, data: { type: "book", containerId, book } });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative transition-transform duration-150"
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
        <DragIndicatorOverlay bookId={book.id} />
      </div>
    );
  },
);

SortableBookCover.displayName = "SortableBookCover";
