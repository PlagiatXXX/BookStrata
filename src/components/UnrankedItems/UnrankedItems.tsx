import { memo } from "react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Book } from "@/types";
import { SortableBookCover } from "@/components/SortableBookCover/SortableBookCover";
import { UNRANKED_AREA_ID } from "@/constants/dnd";
import { ImageUploader } from "@/components/ImageUploader/ImageUploader";

interface UnrankedItemsProps {
  books: Book[];
  onUpload?: (files: File[]) => void;
  onDeleteBook?: (bookId: string) => void;
  onEditBook?: (book: Book) => void;
  onViewBook?: (book: Book) => void;
}

export const UnrankedItems = memo(
  ({ books, onUpload, onDeleteBook, onEditBook, onViewBook }: UnrankedItemsProps) => {
    const { setNodeRef } = useDroppable({
      id: UNRANKED_AREA_ID,
      data: {
        type: "book",
        containerId: UNRANKED_AREA_ID,
      },
    });

    return (
      <div
        ref={setNodeRef}
        className="y2k-panel mt-10 flex flex-col text-[#d8f9ff]"
      >
        <div className="border-b border-cyan-300/35 px-6 py-4">
          <h3 className="text-lg font-bold tracking-[0.04em] text-[#e8ffff]">
            Книги без рейтинга
          </h3>
        </div>

        <div className="p-6">
          <SortableContext
            id={UNRANKED_AREA_ID}
            items={books.map((b) => b.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
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
              <ImageUploader onUpload={onUpload} />
            </div>
          </SortableContext>
        </div>
      </div>
    );
  },
);

UnrankedItems.displayName = "UnrankedItems";
