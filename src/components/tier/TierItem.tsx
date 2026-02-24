import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TierItem as ItemType } from "@/types/tier";
import { GripVertical, X } from "lucide-react";

interface Props {
  item: ItemType;
  onRemove?: (itemId: string) => void;
}

export const TierItem = ({ item, onRemove }: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging
      ? "0 8px 16px rgba(0,0,0,0.4)"
      : "0 2px 4px rgba(0,0,0,0.2)",
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundImage: `url(${item.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="relative w-20 h-20 rounded-lg select-none transition-transform duration-200 ease-out transform hover:scale-105"
      title={item.title}
    >
      <div
        {...listeners}
        {...attributes}
        className="absolute top-0 left-0 right-0 h-4 flex justify-center items-center cursor-grab bg-black/40 rounded-t opacity-0 hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-3 h-3 text-white" />
      </div>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          title="Remove item"
        >
          <X className="w-2 h-2" />
        </button>
      )}
    </div>
  );
};

