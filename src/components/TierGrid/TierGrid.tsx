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
      onChangeTierColor,
      onRenameTier,
      onDeleteTier,
      onDeleteBook,
      onEditBook,
      onViewBook,
      onSetActiveTier,
    } = props;
    const { tiers, tierOrder, books } = listData;

    // Мемоизируем вычисление книг в тирах
    const tierRows = useMemo(() => {
      return tierOrder.map((tierId) => ({
        tier: tiers[tierId],
        booksInTier: tiers[tierId].bookIds.map((id) => books[id]),
      }));
    }, [tierOrder, tiers, books]);

    return (
      <div
        ref={ref}
        className="y2k-panel flex flex-col overflow-hidden text-[#d8f9ff]"
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
          className="group flex min-h-15 w-full cursor-pointer items-center justify-center border-t border-cyan-300/40 bg-[rgba(5,10,22,0.68)] transition-colors hover:border-fuchsia-300/55 hover:bg-[rgba(0,255,255,0.08)] focus:outline-none"
        >
          <PlusCircle
            size={16}
            className="text-cyan-200 transition-colors group-hover:text-fuchsia-200"
          />
          <span className="ml-2 text-sm font-semibold tracking-[0.09em] text-cyan-100 transition-colors group-hover:text-fuchsia-100">
            Добавить тир
          </span>
        </button>
      </div>
    );
  }),
);

TierGrid.displayName = "TierGrid";
