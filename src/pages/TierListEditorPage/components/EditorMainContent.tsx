import { memo, useCallback, useMemo, useState, useEffect } from "react";
import { TierGrid } from "@/components/TierGrid/TierGrid";
import { UnrankedItems } from "@/components/UnrankedItems/UnrankedItems";
import { SettingsSidebar } from "@/components/SettingsSidebar/SettingsSidebar";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
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
  shareUrl?: string;
  title?: string;
  onDeleteRating?: () => void;
  isPublic: boolean;
  onTogglePublic?: (value: boolean) => void;
  isTogglingPublic: boolean;
  onFindBook?: () => void;
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
    shareUrl,
    title,
    onDeleteRating,
    isPublic,
    onTogglePublic,
    isTogglingPublic,
    onFindBook,
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

    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
      try { return localStorage.getItem('tier-editor-sidebar-collapsed') === 'true' }
      catch { return false }
    })

    useEffect(() => {
      localStorage.setItem('tier-editor-sidebar-collapsed', String(sidebarCollapsed))
    }, [sidebarCollapsed])

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

    // Обёртка для onSetActiveTier: при свёрнутом сайдбаре сначала разворачиваем
    const handleSetActiveTier = useCallback((id: string) => {
      if (sidebarCollapsed) setSidebarCollapsed(false)
      onSetActiveTier(id)
    }, [sidebarCollapsed, onSetActiveTier])

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
            onSetActiveTier={handleSetActiveTier}
          />

          {!hideUnranked && (
            <UnrankedItems
              books={unrankedBooks}
              booksCount={totalBooksCount}
              onDeleteBook={isReadOnly ? undefined : onDeleteBook}
              onEditBook={isReadOnly ? undefined : onEditBook}
              onViewBook={onViewBook}
            />
          )}
        </div>

        {!isReadOnly && (
          <div className="hidden lg:flex sticky top-24 self-start shrink-0">
            <div
              data-testid="sidebar-transition-wrapper"
              className={`overflow-hidden transition-[width] duration-300 ease-in-out ${
                sidebarCollapsed ? 'w-0' : 'w-80'
              }`}
            >
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
                <SettingsSidebar
                  key={activeTierData?.id}
                  activeTier={activeTierData || undefined}
                  onUpdateTier={isReadOnly ? undefined : onUpdateTier}
                  onAddRow={isReadOnly ? undefined : onAddRow}
                  onClearRows={isReadOnly ? undefined : () => onClearRows?.()}
                  onDownloadImage={onDownloadImage}
                  shareUrl={shareUrl}
                  title={title}
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
            </div>

            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="flex shrink-0 self-start items-center cursor-pointer group"
              title={sidebarCollapsed ? "Показать боковую панель" : "Скрыть боковую панель"}
              aria-label={sidebarCollapsed ? "Показать боковую панель" : "Скрыть боковую панель"}
            >
              <div className="w-4 min-h-[320px] bg-black border-l-2 border-[#c1fffe]/20 shadow-[inset_0_0_12px_0_rgba(193,255,254,0.12),0_0_15px_3px_rgba(193,255,254,0.1)] group-hover:border-[#c1fffe]/60 group-hover:shadow-[inset_0_0_18px_0_rgba(193,255,254,0.25),0_0_25px_6px_rgba(193,255,254,0.2)] transition-all duration-500" />
              {sidebarCollapsed ? (
                <PanelRightOpen size={16} className="text-[#c1fffe] ml-1.5 group-hover:brightness-150 transition-all duration-300" />
              ) : (
                <PanelRightClose size={16} className="text-[#c1fffe] ml-1.5 group-hover:brightness-150 transition-all duration-300" />
              )}
            </button>
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
          shareUrl={shareUrl}
          title={title}
          onClearRows={() => onClearRows?.()}
          onDeleteRating={() => onDeleteRating?.()}
          isPublic={isPublic}
          onTogglePublic={onTogglePublic}
          isTogglingPublic={isTogglingPublic}
          activeTier={activeTierData || undefined}
          onUpdateTier={isReadOnly ? undefined : onUpdateTier}
        />
      )}
    </>
  );
  },
);
