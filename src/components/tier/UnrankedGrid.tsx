import type { TierItem as ItemType } from "@/types/tier";
import { TierItem } from "./TierItem";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface Props {
  items: ItemType[];
  onAddItem?: () => void;
  onRemoveItem?: (itemId: string) => void;
}

export const UnrankedGrid = ({ items, onAddItem, onRemoveItem }: Props) => {
  return (
    <SortableContext
      items={items.map((i) => i.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        id="unranked"
        className="bg-surface-dark border border-surface-border rounded-xl p-4 transition-colors hover:border-blue-500"
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-white font-bold">Без рейтинга</h3>
          {onAddItem && (
            <button
              onClick={onAddItem}
              className="px-2 py-1 bg-primary text-white rounded hover:bg-purple-800 transition-colors"
            >
              + Добавить
            </button>
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
          {items.map((item) => (
            <TierItem key={item.id} item={item} onRemove={onRemoveItem} />
          ))}
        </div>
      </div>
    </SortableContext>
  );
};
