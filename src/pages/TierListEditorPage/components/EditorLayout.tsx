import { useSensors, useSensor } from "@dnd-kit/core";
import { PointerSensor, TouchSensor, KeyboardSensor } from "@dnd-kit/core";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { BookCover } from "@/ui/BookCover";
import type { Book } from "@/types";
import type { EditorHeaderProps } from "./EditorHeader";
import { EditorHeader } from "./EditorHeader";

interface EditorLayoutProps {
  children: React.ReactNode;
  activeItem: Book | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
  headerProps: EditorHeaderProps;
  onMyRatingsClick: () => void;
  isReadOnly: boolean;
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
}: EditorLayoutProps) => {
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

  const content = (
    <DashboardLayout
      onMyRatingsClick={onMyRatingsClick}
      onSearch={() => {}}
      searchValue=""
      showSearch={false}
    >
      <main className="neo-brutalist-editor flex-1 overflow-y-auto p-4  lg:p-8">
        <EditorHeader {...headerProps} />
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
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {content}
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div
            style={{
              opacity: 0.85,
              transform: "rotate(2deg) scale(1.05)",
              pointerEvents: "none",
            }}
          >
            <BookCover book={activeItem} isDraggable={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
