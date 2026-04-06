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

export const SortableBookCover = memo(
  ({ book, containerId, onDelete, onEdit, onView }: SortableBookCoverProps) => {
    const { active, over } = useDndContext();
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: book.id, data: { type: "book", containerId, book } });

    const isBookDrag = active?.data.current?.type === "book";
    const isHoveredDropTarget =
      isBookDrag && over?.id === book.id && active?.id !== book.id;

    const activeRect = active?.rect.current.translated;
    const overRect = over?.rect;
    const insertAfter =
      isHoveredDropTarget &&
      activeRect &&
      overRect &&
      activeRect.left + activeRect.width / 2 > overRect.left + overRect.width / 2;

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative transition-transform duration-150 ${
          isHoveredDropTarget
            ? insertAfter
              ? "nb-book-insert-after"
              : "nb-book-insert-before"
            : ""
        }`}
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
  },
);
