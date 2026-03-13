import { memo, useCallback } from 'react';
import { TierGrid } from '@/components/TierGrid/TierGrid';
import { UnrankedItems } from '@/components/UnrankedItems/UnrankedItems';
import { SettingsSidebar } from '@/components/SettingsSidebar/SettingsSidebar';
import type { Book, TierListData } from '@/types';

interface EditorMainContentProps {
  listData: TierListData;
  isReadOnly: boolean;
  isPro?: boolean;
  tierGridRef: React.RefObject<HTMLDivElement | null>;
  // Обработчики для TierGrid
  onDeleteBook?: (bookId: string) => void;
  onEditBook?: (book: Book) => void;
  onViewBook: (book: Book) => void;
  activeTierId: string | null;
  onAddRow?: (title?: string) => void;
  onChangeTierColor?: (tierId: string, color: string) => void;
  onRenameTier?: (tierId: string, newTitle: string) => void;
  onDeleteTier?: (tierId: string) => void;
  onSetActiveTier: (id: string | null) => void;
  // Обработчики для SettingsSidebar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateTier?: (tierId: string, settings: any) => void;
  onClearRows?: () => void;
  onDownloadImage: () => void;
  onMyRatingsClick: () => void;
  onDeleteRating?: () => void;
  isPublic: boolean;
  onTogglePublic?: (value: boolean) => void;
  isTogglingPublic: boolean;
  onFindBook?: () => void;
  onUploadBooks?: (files: File[]) => void;
}

export const EditorMainContent = memo(({
  listData,
  isReadOnly,
  isPro = false,
  tierGridRef,
  onDeleteBook,
  onEditBook,
  onViewBook,
  activeTierId,
  onAddRow,
  onChangeTierColor,
  onRenameTier,
  onDeleteTier,
  onSetActiveTier,
  onUpdateTier,
  onClearRows,
  onDownloadImage,
  onMyRatingsClick,
  onDeleteRating,
  isPublic,
  onTogglePublic,
  isTogglingPublic,
  onFindBook,
  onUploadBooks,
}: EditorMainContentProps) => {
  const unrankedBooks = listData.unrankedBookIds
    .map((id) => listData.books[id])
    .filter(Boolean);

  // Общее количество книг во всём тир-листе (в тирах + unranked)
  const totalBooksCount = Object.keys(listData.books).length;

  const activeTierData = activeTierId ? listData.tiers[activeTierId] : null;

  // Стабилизируем обработчики для TierGrid
  const handleChangeTierColor = useCallback(
    (tierId: string, color: string) => {
      onChangeTierColor?.(tierId, color);
    },
    [onChangeTierColor]
  );

  const handleRenameTier = useCallback(
    (tierId: string, newTitle: string) => {
      onRenameTier?.(tierId, newTitle);
    },
    [onRenameTier]
  );

  const handleDeleteTier = useCallback(
    (tierId: string) => {
      onDeleteTier?.(tierId);
    },
    [onDeleteTier]
  );

  const handleAddRow = useCallback(
    (title?: string) => {
      onAddRow?.(title);
    },
    [onAddRow]
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:justify-center">
      <div className="flex max-w-350 flex-1 flex-col gap-4">
        <TierGrid
          ref={tierGridRef}
          listData={listData}
          onDeleteBook={isReadOnly ? undefined : onDeleteBook}
          onEditBook={isReadOnly ? undefined : onEditBook}
          onViewBook={onViewBook}
          activeTierId={activeTierId}
          onAddRow={isReadOnly ? undefined : handleAddRow}
          onChangeTierColor={
            isReadOnly ? undefined : handleChangeTierColor
          }
          onRenameTier={isReadOnly ? undefined : handleRenameTier}
          onDeleteTier={isReadOnly ? undefined : handleDeleteTier}
          onSetActiveTier={onSetActiveTier}
        />

        <UnrankedItems
          books={unrankedBooks}
          booksCount={totalBooksCount}
          onUpload={isReadOnly ? undefined : onUploadBooks}
          onDeleteBook={isReadOnly ? undefined : onDeleteBook}
          onEditBook={isReadOnly ? undefined : onEditBook}
          onViewBook={onViewBook}
          isPro={isPro}
        />
      </div>

      {!isReadOnly && (
        <div className="shrink-0 lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <SettingsSidebar
            key={activeTierData?.id}
            activeTier={activeTierData || undefined}
            onUpdateTier={isReadOnly ? undefined : onUpdateTier}
            onAddRow={isReadOnly ? undefined : onAddRow}
            onClearRows={isReadOnly ? undefined : () => onClearRows?.()}
            onDownloadImage={onDownloadImage}
            onMyRatingsClick={onMyRatingsClick}
            onDeleteRating={isReadOnly ? undefined : () => onDeleteRating?.()}
            isPublic={isPublic}
            onTogglePublic={isReadOnly ? undefined : onTogglePublic}
            isTogglingPublic={isTogglingPublic}
            onFindBook={isReadOnly ? undefined : () => onFindBook?.()}
          />
        </div>
      )}
    </div>
  );
});

