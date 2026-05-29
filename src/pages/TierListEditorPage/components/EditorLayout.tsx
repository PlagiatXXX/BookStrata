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
  isPro: boolean;
  tierListId?: string;
  coverImageUrl?: string | null;
  hideCover?: boolean;
  theme?: string;
  booksCount: number;
  onCoverUpdated?: (url: string) => void;
  onThemeChanged?: (theme: string) => void;
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
  isPro = false,
  tierListId,
  coverImageUrl,
  hideCover = false,
  theme = "default",
  booksCount = 0,
  onCoverUpdated,
  onThemeChanged,
}: EditorLayoutProps) => {
  const activeBook =
    activeItem && "coverImageUrl" in activeItem ? activeItem : null;

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
        {tierListId && !hideCover && (
          <TierListCoverEditor
            tierListId={tierListId}
            coverImageUrl={coverImageUrl}
            title={headerProps.title}
            booksCount={booksCount}
            isPro={isPro}
            isReadOnly={isReadOnly}
            onCoverUpdated={(url) => onCoverUpdated?.(url)}
          />
        )}
        {children}
        {tierListId && !isReadOnly && (
          <ThemePicker
            tierListId={tierListId}
            currentTheme={theme}
            isPro={isPro}
            onThemeChanged={(t) => onThemeChanged?.(t)}
          />
        )}
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
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
