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
const TierGridRow = memo(
  ({
    tier,
    allBooks,
    isActive,
    onChangeColor,
    onRename,
    onDelete,
    onDeleteBook,
    onEditBook,
    onViewBook,
    onSetActive,
  }: {
    tier: Tier;
    allBooks: Record<string, Book>;
    isActive: boolean;
    onChangeColor?: (tierId: string, newColor: string) => void;
    onRename?: (tierId: string, newTitle: string) => void;
    onDelete?: (tierId: string) => void;
    onDeleteBook?: (bookId: string) => void;
    onEditBook?: (book: Book) => void;
    onViewBook?: (book: Book) => void;
    onSetActive: (tierId: string) => void;
  }) => {
    // Extract book IDs to create a stable dependency for mapping
    const bookIds = tier.bookIds;

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
  },
  (prevProps, nextProps) => {
    // Проверяем основные пропсы на равенство
    if (prevProps.isActive !== nextProps.isActive) return false;
    if (prevProps.tier !== nextProps.tier) return false;
    if (prevProps.onChangeColor !== nextProps.onChangeColor) return false;
    if (prevProps.onRename !== nextProps.onRename) return false;
    if (prevProps.onDelete !== nextProps.onDelete) return false;
    if (prevProps.onDeleteBook !== nextProps.onDeleteBook) return false;
    if (prevProps.onEditBook !== nextProps.onEditBook) return false;
    if (prevProps.onViewBook !== nextProps.onViewBook) return false;
    if (prevProps.onSetActive !== nextProps.onSetActive) return false;

    // Оптимизация Bolt: проверяем только книги, которые находятся в этом тире.
    // Если в глобальном словаре allBooks изменились другие книги, мы не будем ререндерить этот ряд.
    const prevIds = prevProps.tier.bookIds;
    const nextIds = nextProps.tier.bookIds;

    if (prevIds.length !== nextIds.length) return false;

    for (let i = 0; i < prevIds.length; i++) {
      const id = prevIds[i];
      // Если ID разные или сам объект книги изменился
      if (
        prevIds[i] !== nextIds[i] ||
        prevProps.allBooks[id] !== nextProps.allBooks[id]
      ) {
        return false;
      }
    }

    return true;
  },
);

TierGridRow.displayName = "TierGridRow";

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
      onSetActiveTier = () => {},
    } = props;
    const { tiers, tierOrder, books } = listData;

    // Фильтруем tierOrder — убираем ID, которых нет в tiers (защита от race condition)
    const validTierOrder = tierOrder.filter((id) => id && tiers[id]);

    return (
      <div ref={ref} className="flex flex-col gap-0.5 bg-transparent">
        <SortableContext
          items={validTierOrder}
          strategy={verticalListSortingStrategy}
        >
          {validTierOrder.map((tierId) => (
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

        {onAddRow && (
          <button
            onClick={() => onAddRow()}
            className="nb-btn-secondary w-full flex min-h-16 max-md:min-h-12 items-center justify-center border-dashed opacity-60 hover:opacity-100 transition-opacity"
          >
            <PlusCircle size={20} className="max-md:size-4" />
            <span className="ml-3 nb-label-md max-md:text-[10px]">Добавить блок</span>
          </button>
        )}
      </div>
    );
  }),
);

TierGrid.displayName = "TierGrid";
