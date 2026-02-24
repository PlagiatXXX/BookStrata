import { useState } from "react";
import type {
  TierRow as TierRowType,
  TierItem as ItemType,
} from "@/types/tier";
import { TierItem } from "./TierItem";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

interface Props {
  row: TierRowType;
  items: Record<string, ItemType>;
  onUpdateLabel?: (rowId: string, newLabel: string) => void;
  onRemoveItem?: (itemId: string) => void;
}

export const TierRow = ({ row, items, onUpdateLabel, onRemoveItem }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(row.label);

  const handleSave = () => {
    if (onUpdateLabel && editValue.trim() !== row.label) {
      onUpdateLabel(row.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(row.label);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center mb-4">
      <div
        className="w-12 shrink-0 text-white font-bold text-lg flex justify-center items-center rounded-lg p-2 cursor-pointer hover:opacity-80"
        style={{ backgroundColor: row.color }}
        onClick={() => setIsEditing(true)}
        title="Click to edit"
      >
        {isEditing ? (
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="w-full bg-transparent text-center outline-none"
            autoFocus
          />
        ) : (
          row.label
        )}
      </div>

      <SortableContext
        items={row.itemIds}
        strategy={horizontalListSortingStrategy}
      >
        <div
          id={row.id}
          className="flex flex-wrap gap-2 ml-4 flex-1 p-2 border-2 border-transparent hover:border-blue-500 rounded-lg transition-all duration-200"
        >
          {row.itemIds.map((id) => (
            <TierItem key={id} item={items[id]} onRemove={onRemoveItem} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};
