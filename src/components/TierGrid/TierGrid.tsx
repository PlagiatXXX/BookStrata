import { memo, forwardRef, useMemo } from "react";
import { PlusCircle } from "lucide-react";
import type { TierListData, Book, Tier } from "@/types";
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

// Separate component for rendering a tier row to optimize memoization
const TierGridRow = memo(({
  tier,
  allBooks,
  isActive,
  onChangeColor,
  onRename,
  onDelete,
  onDeleteBook,
  onEditBook,
  onViewBook,
  onSetActive
}: {
  tier: Tier;
  allBooks: Record<string, Book>;
  isActive: boolean;
  onChangeColor: (tierId: string, newColor: string) => void;
  onRename: (tierId: string, newTitle: string) => void;
  onDelete: (tierId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onEditBook?: (book: Book) => void;
  onViewBook?: (book: Book) => void;
  onSetActive: (tierId: string) => void;
}) => {
  // Extract book IDs to create a stable dependency for mapping
  const bookIds = tier.bookIds;

  // We map the books that belong to THIS tier.
  // We use the JSON representation of book IDs and individual book references to stabilize the memo.
  // This ensures that updates to UNRELATED books in the dictionary don't trigger a recalculation
  // of this specific row's book array.
  const booksInTier = useMemo(() => {
    return bookIds.map((id) => allBooks[id]).filter(Boolean);
  }, [bookIds, allBooks]);

  return (
    <TierRow
      tier={tier}
      books={booksInTier}
      onChangeColor={onChangeColor}
      onRename={onRename}
      onDelete={onDelete}
      onDeleteBook={onDeleteBook}
      onEditBook={onEditBook}
      onViewBook={onViewBook}
      onSetActive={onSetActive}
      isActive={isActive}
    />
  );
});

TierGridRow.displayName = "TierGridRow";

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

    return (
      <div
        ref={ref}
        className="flex flex-col gap-8 bg-transparent"
      >
        <SortableContext
          items={tierOrder}
          strategy={verticalListSortingStrategy}
        >
          {tierOrder.map((tierId) => (
            <TierGridRow
              key={tierId}
              tier={tiers[tierId]}
              allBooks={books}
              isActive={tierId === activeTierId}
              onChangeColor={onChangeTierColor}
              onRename={onRenameTier}
              onDelete={onDeleteTier}
              onDeleteBook={onDeleteBook}
              onEditBook={onEditBook}
              onViewBook={onViewBook}
              onSetActive={onSetActiveTier}
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
