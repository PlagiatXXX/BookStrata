import { memo, forwardRef, useMemo } from "react";
import { PlusCircle } from "lucide-react";
import type { TierListData, Book } from "@/types";
import { TierRow } from "../TierRow/TierRow";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface TierGridProps {
  listData: TierListData;
  activeTierId: string | null;
  onAddRow?: () => void;
  onChangeTierColor?: (tierId: string, newColor: string) => void;
  onRenameTier?: (tierId: string, newTitle: string) => void;
  onDeleteTier?: (tierId: string) => void;
  onSetActiveTier?: (tierId: string) => void;
  onDeleteBook?: (bookId: string) => void;
  onEditBook?: (book: Book) => void;
  onViewBook?: (book: Book) => void;
}

export const TierGrid = memo(
  forwardRef<HTMLDivElement, TierGridProps>((props, ref) => {
    const {
      listData,
      activeTierId,
      onAddRow,
      onChangeTierColor = () => {},
      onRenameTier = () => {},
      onDeleteTier = () => {},
      onDeleteBook = () => {},
      onEditBook,
      onViewBook,
      onSetActiveTier = () => {},
    } = props;
    const { tiers, tierOrder, books } = listData;

    const tierRows = useMemo(() => {
      return tierOrder.map((tierId) => ({
        tier: tiers[tierId],
        booksInTier: tiers[tierId].bookIds.map((id) => books[id]),
      }));
    }, [tierOrder, tiers, books]);

    return (
      <div
        ref={ref}
        className="flex flex-col gap-8 bg-transparent"
      >
        <SortableContext
          items={tierOrder}
          strategy={verticalListSortingStrategy}
        >
          {tierRows.map(({ tier, booksInTier }) => (
            <TierRow
              key={tier.id}
              tier={tier}
              books={booksInTier}
              onChangeColor={onChangeTierColor}
              onRename={onRenameTier}
              onDelete={onDeleteTier}
              onDeleteBook={onDeleteBook}
              onEditBook={onEditBook}
              onViewBook={onViewBook}
              onSetActive={onSetActiveTier}
              isActive={tier.id === activeTierId}
            />
          ))}
        </SortableContext>

        <button
          onClick={() => onAddRow?.()}
          className="nb-btn-secondary w-full flex min-h-16 items-center justify-center border-dashed opacity-60 hover:opacity-100 transition-opacity"
        >
          <PlusCircle size={20} />
          <span className="ml-3 nb-label-md">Добавить тир</span>
        </button>
      </div>
    );
  }),
);

TierGrid.displayName = "TierGrid";
