import { memo, useCallback, useMemo } from "react";
import { TierGrid } from "@/components/TierGrid/TierGrid";
import { UnrankedItems } from "@/components/UnrankedItems/UnrankedItems";
import { SettingsSidebar } from "@/components/SettingsSidebar/SettingsSidebar";
import { MobileToolbar } from "./MobileToolbar";
import type { Book, TierListData } from "@/types";
import type { SaveStatus } from "../hooks/useTierEditorSave";

interface EditorMainContentProps {
  listData: TierListData;
  isReadOnly: boolean;
  hideUnranked?: boolean;
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
  onDeleteRating?: () => void;
  isPublic: boolean;
  onTogglePublic?: (value: boolean) => void;
  isTogglingPublic: boolean;
  onFindBook?: () => void;
  onUploadBooks?: (files: File[]) => void;
  saveStatus?: SaveStatus;
  lastSaved?: Date | null;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
}

export const EditorMainContent = memo(
  ({
    listData,
    isReadOnly,
    hideUnranked = false,
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
    onDeleteRating,
    isPublic,
    onTogglePublic,
    isTogglingPublic,
    onFindBook,
    onUploadBooks,
    saveStatus,
    lastSaved,
    hasUnsavedChanges,
    onSave,
  }: EditorMainContentProps) => {
    // Memoize derived data to prevent unnecessary re-renders
    const unrankedBooks = useMemo(
      () =>
        listData.unrankedBookIds
          .map((id) => listData.books[id])
          .filter(Boolean),
      [listData.unrankedBookIds, listData.books],
    );

    const totalBooksCount = useMemo(
      () => Object.keys(listData.books).length,
      [listData.books],
    );

    const activeTierData = useMemo(
      () => (activeTierId ? listData.tiers[activeTierId] : null),
      [activeTierId, listData.tiers],
    );

    // Стабилизируем обработчики для TierGrid
    const handleChangeTierColor = useCallback(
      (tierId: string, color: string) => {
        onChangeTierColor?.(tierId, color);
      },
      [onChangeTierColor],
    );

    const handleRenameTier = useCallback(
      (tierId: string, newTitle: string) => {
        onRenameTier?.(tierId, newTitle);
      },
      [onRenameTier],
    );

    const handleDeleteTier = useCallback(
      (tierId: string) => {
        onDeleteTier?.(tierId);
      },
      [onDeleteTier],
    );

    const handleAddRow = useCallback(
      (title?: string) => {
        onAddRow?.(title);
      },
      [onAddRow],
    );

    return (
      <><div className="flex flex-col gap-6 lg:flex-row lg:justify-center">
        <div className="flex max-w-full flex-1 lg:max-w-350 flex-col gap-4">
          <TierGrid
            ref={tierGridRef}
            listData={listData}
            onDeleteBook={isReadOnly ? undefined : onDeleteBook}
            onEditBook={isReadOnly ? undefined : onEditBook}
            onViewBook={onViewBook}
            activeTierId={activeTierId}
            onAddRow={isReadOnly ? undefined : handleAddRow}
            onChangeTierColor={isReadOnly ? undefined : handleChangeTierColor}
            onRenameTier={isReadOnly ? undefined : handleRenameTier}
            onDeleteTier={isReadOnly ? undefined : handleDeleteTier}
            onSetActiveTier={onSetActiveTier}
          />

          {!hideUnranked && (
            <UnrankedItems
              books={unrankedBooks}
              booksCount={totalBooksCount}
              onUpload={isReadOnly ? undefined : onUploadBooks}
              onDeleteBook={isReadOnly ? undefined : onDeleteBook}
              onEditBook={isReadOnly ? undefined : onEditBook}
              onViewBook={onViewBook}
            />
          )}
        </div>

        {!isReadOnly && (
          <div className="hidden shrink-0 lg:sticky lg:top-4 lg:self-start lg:block">
            <SettingsSidebar
              key={activeTierData?.id}
              activeTier={activeTierData || undefined}
              onUpdateTier={isReadOnly ? undefined : onUpdateTier}
              onAddRow={isReadOnly ? undefined : onAddRow}
              onClearRows={isReadOnly ? undefined : () => onClearRows?.()}
              onDownloadImage={onDownloadImage}
              onDeleteRating={isReadOnly ? undefined : () => onDeleteRating?.()}
              isPublic={isPublic}
              onTogglePublic={isReadOnly ? undefined : onTogglePublic}
              isTogglingPublic={isTogglingPublic}
              onFindBook={isReadOnly ? undefined : () => onFindBook?.()}
              saveStatus={saveStatus}
              lastSaved={lastSaved}
              hasUnsavedChanges={hasUnsavedChanges}
              onSave={onSave}
            />
          </div>
        )}
      </div>

      {!isReadOnly && (
        <MobileToolbar
          onSave={() => onSave?.()}
          saveStatus={saveStatus ?? "idle"}
          lastSaved={lastSaved ?? null}
          hasUnsavedChanges={hasUnsavedChanges ?? false}
          onFindBook={onFindBook}
          onAddRow={onAddRow}
          onDownloadImage={onDownloadImage}
          onClearRows={() => onClearRows?.()}
          onDeleteRating={() => onDeleteRating?.()}
          isPublic={isPublic}
          onTogglePublic={onTogglePublic}
          isTogglingPublic={isTogglingPublic}
        />
      )}
    </>
  );
  },
);
