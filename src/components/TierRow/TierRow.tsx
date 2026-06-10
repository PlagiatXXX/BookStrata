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
  onChangeColor?: (tierId: string, newColor: string) => void;
  onRename?: (tierId: string, newTitle: string) => void;
  onDelete?: (tierId: string) => void;
  onSetActive: (tierId: string) => void;
  isActive: boolean;
  onDeleteBook?: (bookId: string) => void;
  onEditBook?: (book: Book) => void;
  onViewBook?: (book: Book) => void;
}

const TierDropIndicator = memo(({ tierId }: { tierId: string }) => {
  const { over, active } = useDndContext();
  const isBookDropTarget = over?.id === tierId && active?.data.current?.type === "book";

  if (!isBookDropTarget) return null;

  return (
    <div
      className="nb-book-track-end-indicator"
      aria-hidden="true"
    />
  );
});

TierDropIndicator.displayName = "TierDropIndicator";

const TierDropTargetOverlay = memo(({ tierId }: { tierId: string }) => {
  const { over, active } = useDndContext();
  const isBookDropTarget = over?.id === tierId && active?.data.current?.type === "book";

  if (!isBookDropTarget) return null;

  return (
    <div
      className="absolute inset-0 nb-tier-row-drop-target pointer-events-none"
      aria-hidden="true"
    />
  );
});

TierDropTargetOverlay.displayName = "TierDropTargetOverlay";

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

    return (
      <div
        ref={setSortableRef}
        style={style}
        className={`nb-tier-row group relative flex ${activeClass}`}
        role="listitem"
      >
        <TierDropTargetOverlay tierId={tier.id} />

        <TierLabel
          tierId={tier.id}
          title={tier.title}
          color={tier.color}
          labelSize={tier.labelSize}
          onChangeColor={onChangeColor}
          onRename={onRename}
        />

        <SortableContext
          id={`books-${tier.id}`}
          items={tier.bookIds.map((id) => `book-${id}`)}
          strategy={horizontalListSortingStrategy}
        >
          <div
            className="nb-book-track relative flex flex-1 flex-wrap content-start items-center transition-colors"
          >
            <TierDropIndicator tierId={tier.id} />
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

        {onDelete !== undefined && (
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
              aria-label="Настройки блока"
              className="text-gray-400 hover:text-[#c1fffe] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none rounded-sm"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => onDelete(tier.id)}
              title="Удалить блок"
              aria-label="Удалить блок"
              className="text-gray-400 hover:text-[#ff51fa] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none rounded-sm"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
    );
  },
);

TierRow.displayName = "TierRow";
