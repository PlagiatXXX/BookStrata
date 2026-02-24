import type { TierState } from "@/types/tier";
import { TierRow } from "./TierRow";
import { UnrankedGrid } from "./UnrankedGrid";

interface Props {
  state: TierState;
  onAddUnrankedItem?: () => void;
  onUpdateRowLabel?: (rowId: string, newLabel: string) => void;
  onRemoveItem?: (itemId: string) => void;
}

export const TierBoard = ({
  state,
  onAddUnrankedItem,
  onUpdateRowLabel,
  onRemoveItem,
}: Props) => {
  const unrankedItems = state.unrankedItemIds.map((id) => state.items[id]);

  return (
    <div className="flex flex-col gap-4">
      {state.rows.map((row) => (
        <TierRow
          key={row.id}
          row={row}
          items={state.items}
          onUpdateLabel={onUpdateRowLabel}
          onRemoveItem={onRemoveItem}
        />
      ))}
      <UnrankedGrid items={unrankedItems} onAddItem={onAddUnrankedItem} onRemoveItem={onRemoveItem} />
    </div>
  );
};

