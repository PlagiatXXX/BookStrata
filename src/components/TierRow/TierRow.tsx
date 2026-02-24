import {
  useSortable,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
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
    const {
      attributes,
      listeners,
      setNodeRef: setSortableRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: tier.id,
      data: {
        type: "tier",
      },
    });

    /* ---------- DROPPABLE КОНТЕЙНЕР ---------- */
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
      id: `drop-${tier.id}`,
      data: {
        type: "container",
        containerId: tier.id,
      },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 100 : "auto",
      minHeight: tier.height ? `${tier.height}px` : "140px",
    };

    const activeClass = isActive
      ? "border-2 border-cyan-400 shadow-lg z-10"
      : "border-b";
    const droppableActiveClass = isOver ? "bg-primary/10" : "";

    return (
      <div
        ref={setSortableRef}
        style={style}
        className={`group relative flex ${activeClass}`}
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
            ref={setDroppableRef}
            className={`relative flex flex-1 flex-wrap content-start items-center gap-3 bg-surface-dark/50 p-2 transition-colors group-hover:bg-surface-dark/80 ${droppableActiveClass}`}
          >
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

        <div className="absolute right-0 top-0 bottom-0 z-10 flex w-12 flex-col items-center justify-center gap-2 border-l border-surface-border bg-[#231028] transition-opacity">
          <button
            title="Переместить"
            className="cursor-grab text-gray-400 active:cursor-grabbing hover:text-white"
            {...attributes}
            {...listeners}
          >
            <GripVertical />
          </button>
          <button
            onClick={() => onSetActive(tier.id)}
            title="Настройки"
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => onDelete(tier.id)}
            title="Удалить тир"
            className="text-gray-400 hover:text-red-400 cursor-pointer"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    );
  },
);
