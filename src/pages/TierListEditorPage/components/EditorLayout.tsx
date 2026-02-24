import { useSensors, useSensor } from '@dnd-kit/core';
import { PointerSensor, TouchSensor, KeyboardSensor } from '@dnd-kit/core';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { DashboardLayout } from '@/layouts/DashboardLayout/DashboardLayout';
import { BookCover } from '@/ui/BookCover';
import type { Book, Tier } from '@/types';
import type { EditorHeaderProps } from './EditorHeader';
import { EditorHeader } from './EditorHeader';

interface EditorLayoutProps {
  children: React.ReactNode;
  activeItem: Book | Tier | null;
  onDragStart: (event: DragStartEvent) => void;
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
  onDragEnd,
  onDragCancel,
  headerProps,
  onMyRatingsClick,
  isReadOnly,
}: EditorLayoutProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
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
      <main className="tier-editor-y2k flex-1 overflow-y-auto p-4 text-[#d8f9ff] lg:p-8">
        <EditorHeader {...headerProps} />
        {children}
      </main>
    </DashboardLayout>
  );

  if (isReadOnly) {
    return content;
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
      {content}
      <DragOverlay dropAnimation={null}>
        {activeItem && 'coverImageUrl' in activeItem ? (
          <BookCover book={activeItem as Book} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
