import {
  useSortable,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDndContext } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Settings, Trash2 } from "lucide-react";
import type { Tier, Book } from "@/types";
import { TierLabel } from "@/ui/TierLabel";
import { SortableBookCover } from "@/components/SortableBookCover/SortableBookCover";
import { memo } from "react";

interface TierRowProps {
  tier: Tier;
  books: Book[];
  onChangeColor: (tierId: string, newColor: string) => void;
  onRename: (tierId: string, newTitle: string) => void;
  onDelete: (tierId: string) => void;
  onSetActive: (tierId: string) => void;
  isActive: boolean;
  onDeleteBook: (bookId: string) => void;
  onEditBook?: (book: Book) => void;
  onViewBook?: (book: Book) => void;
}

export const TierRow = memo(
  ({
    tier,
    books,
    onChangeColor,
    onRename,
    onDelete,
    onSetActive,
    isActive,
    onDeleteBook,
    onEditBook,
    onViewBook,
  }: TierRowProps) => {
    /* ---------- SORTABLE ТИР ---------- */
    const { over } = useDndContext();
    const {
      attributes,
      listeners,
      setNodeRef: setSortableRef,
      transform,
      transition,
      isDragging,
      isOver,
      active,
    } = useSortable({
      id: tier.id,
      data: {
        type: "tier",
        tier,
      },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 100 : "auto",
      minHeight: tier.height ? `${tier.height}px` : undefined,
    };

    const activeClass = isActive ? "nb-tier-row-active" : "";
    const isBookDropTarget = isOver && active?.data.current?.type === "book";
    const showEndInsertIndicator = isBookDropTarget && over?.id === tier.id;

    return (
      <div
        ref={setSortableRef}
        style={style}
        className={`nb-tier-row group relative flex ${activeClass} ${
          isBookDropTarget ? "nb-tier-row-drop-target" : ""
        }`}
        role="listitem"
      >
        <TierLabel
          tierId={tier.id}
          title={tier.title}
          color={tier.color}
          labelSize={tier.labelSize}
          onChangeColor={onChangeColor}
          onRename={onRename}
        />

        <SortableContext
          id={tier.id}
          items={tier.bookIds}
          strategy={horizontalListSortingStrategy}
        >
          <div
            className={`nb-book-track relative flex flex-1 flex-wrap content-start items-center
                       transition-colors ${
                         isBookDropTarget ? "nb-book-track-drop-target" : ""
                       }`}
          >
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
                containerId={tier.id}
              />
            ))}
            {books.length === 0 && (
              <div className="w-full h-full pointer-events-none" />
            )}
          </div>
        </SortableContext>

        <div className="nb-tier-actions absolute right-0 top-0 bottom-0 z-10 flex w-12 flex-col items-center justify-center gap-2 border-l-2 border-black bg-[#0e0e0e] transition-opacity opacity-0 group-hover:opacity-100 focus-within:opacity-100">
          <button
            title="Переместить"
            aria-label="Переместить уровень"
            className="cursor-grab text-gray-400 active:cursor-grabbing hover:text-[#c1fffe] transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none rounded-sm"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={20} />
          </button>
          <button
            onClick={() => onSetActive(tier.id)}
            title="Настройки"
            aria-label="Настройки уровня"
            className="text-gray-400 hover:text-[#c1fffe] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none rounded-sm"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => onDelete(tier.id)}
            title="Удалить тир"
            aria-label="Удалить уровень"
            className="text-gray-400 hover:text-[#ff51fa] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none rounded-sm"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    );
  },
);
