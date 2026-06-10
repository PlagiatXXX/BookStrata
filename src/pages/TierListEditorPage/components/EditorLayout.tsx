import { useSensors, useSensor } from "@dnd-kit/core";
import { PointerSensor, TouchSensor, KeyboardSensor } from "@dnd-kit/core";
import { DndContext, DragOverlay, rectIntersection } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { BookCover } from "@/ui/BookCover";
import { TierLabel } from "@/ui/TierLabel";
import type { Book, Tier } from "@/types";
import type { EditorHeaderProps } from "./EditorHeader";
import { EditorHeader } from "./EditorHeader";
import { TierListCoverEditor } from "./TierListCoverEditor";
import { ThemePicker } from "./ThemePicker";

interface EditorLayoutProps {
  children: React.ReactNode;
  activeItem: Book | Tier | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
  headerProps: EditorHeaderProps;
  onMyRatingsClick: () => void;
  isReadOnly: boolean;
  tierListId?: string;
  coverImageUrl?: string | null;
  hideCover?: boolean;
  theme?: string;
  booksCount: number;
  onCoverUpdated?: (url: string) => void;
  onThemeChanged?: (theme: string) => void;
  ownerUserId?: number;
  currentUserId?: number | null;
}

export const EditorLayout = ({
  children,
  activeItem,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
  headerProps,
  onMyRatingsClick,
  isReadOnly,
  tierListId,
  coverImageUrl,
  hideCover = false,
  theme = "default",
  booksCount = 0,
  onCoverUpdated,
  onThemeChanged,
  ownerUserId,
  currentUserId,
}: EditorLayoutProps) => {
  const activeBook: Book | null =
    activeItem && "coverImageUrl" in activeItem ? (activeItem as Book) : null;
  const activeTier: Tier | null =
    activeItem && "color" in activeItem && "title" in activeItem && !("coverImageUrl" in activeItem)
      ? (activeItem as Tier)
      : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
      preventScroll: true,
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
      preventScroll: true,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const headerActiveItem = isReadOnly ? undefined : "Мои Рейтинги";

  const content = (
    <DashboardLayout
      onMyRatingsClick={onMyRatingsClick}
      onSearch={() => {}}
      searchValue=""
      showSearch={false}
      activeItem={headerActiveItem}
    >
      <main className="neo-brutalist-editor flex-1 overflow-y-auto p-4  lg:p-8" data-theme={theme}>
        <EditorHeader {...headerProps} />
        <div className="flex flex-wrap gap-3 items-start mb-6">
          {tierListId && !hideCover && (
            <TierListCoverEditor
              tierListId={tierListId}
              coverImageUrl={coverImageUrl}
              title={headerProps.title}
              booksCount={booksCount}
              isReadOnly={isReadOnly}
              onCoverUpdated={(url) => onCoverUpdated?.(url)}
              ownerUserId={ownerUserId}
              currentUserId={currentUserId}
            />
          )}
          {tierListId && !isReadOnly && (
            <div className="pl-4 flex-1 min-w-0 mt-0.5">
              <ThemePicker
                tierListId={tierListId}
                currentTheme={theme}
                onThemeChanged={(t) => onThemeChanged?.(t)}
              />
            </div>
          )}
        </div>
        {children}
      </main>
    </DashboardLayout>
  );

  if (isReadOnly) {
    return content;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {content}
      <DragOverlay dropAnimation={null} zIndex={10001}>
        {activeBook ? (
          <div
            style={{
              opacity: 0.85,
              transform: "rotate(2deg) scale(1.05)",
            }}
          >
            <BookCover book={activeBook} isDraggable={false} />
          </div>
        ) : activeTier ? (
          <div
            className="flex items-center gap-2 rounded-lg px-4 py-2 shadow-xl"
            style={{
              opacity: 0.85,
              transform: "rotate(1deg) scale(1.02)",
              backgroundColor: activeTier.color || "#808080",
              minWidth: 200,
            }}
          >
            <TierLabel
              tierId={activeTier.id}
              title={activeTier.title}
              color={activeTier.color}
              labelSize={activeTier.labelSize}
            />
            <span className="text-white font-medium truncate">
              {activeTier.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
