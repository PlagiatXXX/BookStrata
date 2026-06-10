import { memo } from "react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import type { Book } from "@/types";
import { SortableBookCover } from "@/components/SortableBookCover/SortableBookCover";
import { ImageUploader } from "@/components/ImageUploader/ImageUploader";
import { BookCounter } from "@/components/BookCounter/BookCounter";
import { UNRANKED_AREA_ID } from "@/constants/dnd";

interface UnrankedItemsProps {
  books: Book[];
  booksCount?: number;
  onUpload?: (files: File[]) => void;
  onDeleteBook?: (bookId: string) => void;
  onEditBook?: (book: Book) => void;
  onViewBook?: (book: Book) => void;
}

export const UnrankedItems = memo(
  ({ books, booksCount, onUpload, onDeleteBook, onEditBook, onViewBook }: UnrankedItemsProps) => {
    const { over } = useDndContext();
    const { setNodeRef, isOver, active } = useDroppable({
      id: UNRANKED_AREA_ID,
      data: {
        type: "book",
        containerId: UNRANKED_AREA_ID,
      },
    });

    const displayBooksCount = booksCount ?? books.length;
    const isBookDropTarget = isOver && active?.data.current?.type === "book";
    const showEndInsertIndicator =
      isBookDropTarget && over?.id === UNRANKED_AREA_ID;

    return (
      <div
        ref={setNodeRef}
        className={`nb-sidebar mt-10 flex flex-col text-white ${
          isBookDropTarget ? "nb-sidebar-drop-target" : ""
        }`}
      >
        <div className="nb-section-header">
          <h3 className="nb-label-md text-[#c1fffe]">
            Книги без рейтинга
          </h3>
        </div>

        <div className="p-4">
          <div className="mb-8">
            <BookCounter booksCount={displayBooksCount} />
          </div>

          <SortableContext
            id={UNRANKED_AREA_ID}
            items={books.map((b) => `book-${b.id}`)}
            strategy={rectSortingStrategy}
          >
            <div className="relative flex flex-wrap gap-4">
              {showEndInsertIndicator ? (
                <div
                  className="nb-book-track-end-indicator"
                  aria-hidden="true"
                />
              ) : null}
              {books.map((book) => (
                <SortableBookCover
                  key={book.id}
                  book={book}
                  onDelete={onDeleteBook}
                  onEdit={onEditBook}
                  onView={onViewBook}
                  containerId={UNRANKED_AREA_ID}
                />
              ))}
              {onUpload && <ImageUploader onUpload={onUpload} />}
            </div>
          </SortableContext>
        </div>
      </div>
    );
  },
);

UnrankedItems.displayName = "UnrankedItems";
