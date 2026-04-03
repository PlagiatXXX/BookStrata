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
      minHeight: tier.height ? `${tier.height}px` : undefined,
    };

    const activeClass = isActive
      ? "border-cyan-400 !border-opacity-100 shadow-[4px_4px_0_0_#c1fffe]"
      : "";
    const droppableActiveClass = isOver ? "bg-[#c1fffe]/10" : "";

    return (
      <div
        ref={setSortableRef}
        style={style}
        className={`nb-tier-row group relative flex ${activeClass} nb-snap`}
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
            className={`nb-book-track relative flex flex-1 flex-wrap content-start items-center
                       transition-colors ${droppableActiveClass}`}
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

        <div className="nb-heavy-border absolute -right-14 top-0 bottom-0 z-10 flex w-12 flex-col items-center justify-center gap-4 bg-black border-l-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            title="Переместить"
            className="cursor-grab text-white hover:text-[#c1fffe] transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={20} />
          </button>
          <button
            onClick={() => onSetActive(tier.id)}
            title="Настройки"
            className="text-white hover:text-[#c1fffe] cursor-pointer transition-colors"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => onDelete(tier.id)}
            title="Удалить тир"
            className="text-white hover:text-[#ff51fa] cursor-pointer transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    );
  },
);
