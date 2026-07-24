import { useState } from "react";
import { useSensors, useSensor } from "@dnd-kit/core";
import { MouseSensor, TouchSensor, KeyboardSensor } from "@dnd-kit/core";
import { DndContext, DragOverlay, pointerWithin, rectIntersection, type CollisionDetection } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { ArrowLeft, ChevronUp } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { BookCover } from "@/ui/BookCover";
import { TierLabel } from "@/ui/TierLabel";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import type { Book, Tier } from "@/types";
import type { EditorHeaderProps } from "./EditorHeader";
import { EditorHeader } from "./EditorHeader";
import { TierListCoverEditor } from "./TierListCoverEditor";
import { ThemePicker } from "./ThemePicker";

// Кастомный алгоритм коллизий:
// 1. pointerWithin — точное попадание курсора в карточку/контейнер
// 2. rectIntersection — fallback для пустых тиров и стыков между карточками
const customCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;

  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) return rectCollisions;

  return [];
};

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
  breadcrumbItems?: { label: string; href?: string }[];
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
  breadcrumbItems,
}: EditorLayoutProps) => {
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);
  const activeBook: Book | null =
    activeItem && "coverImageUrl" in activeItem ? (activeItem as Book) : null;
  const activeTier: Tier | null =
    activeItem && "color" in activeItem && "title" in activeItem && !("coverImageUrl" in activeItem)
      ? (activeItem as Tier)
      : null;

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
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
      fullWidth={!isReadOnly}
      hideMobileNav={!isReadOnly}
      hideLogout={true}
    >
      <main className={`neo-brutalist-editor flex-1 overflow-x-clip ${isReadOnly ? "px-4 lg:px-8 pb-4 lg:pb-8 pt-1" : "p-4 lg:p-8 pb-24 lg:pb-8"}`} data-theme={theme}>
        {/* Кнопка «На главную» только на мобилках, т.к. нижний нав скрыт и логотип неочевиден */}
        <button
          onClick={onMyRatingsClick}
          className="md:hidden flex items-center gap-1.5 text-sm text-cyan-300 hover:text-white transition-colors mb-3 cursor-pointer"
          type="button"
        >
          <ArrowLeft size={16} />
          На главную
        </button>
        {breadcrumbItems && (
          <div className="mb-4">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        )}
        {/* Верхняя секция: название + обложка + тема — сворачиваемая */}
        <div
          className={`overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${
            isTopCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          }`}
          style={{ display: "grid" }}
        >
          <div className="min-h-0">
            <EditorHeader {...headerProps} />
            {!isReadOnly && (
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
                {tierListId && (
                  <div className="pl-4 flex-1 min-w-0 mt-0.5">
                    <ThemePicker
                      tierListId={tierListId}
                      currentTheme={theme}
                      onThemeChanged={(t) => onThemeChanged?.(t)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Кнопка-стрелка для сворачивания/разворачивания верхней секции */}
        {!isReadOnly && (
          <button
            onClick={() => setIsTopCollapsed((v) => !v)}
            className="flex items-center justify-center w-full py-1.5 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer group"
            type="button"
            aria-label={isTopCollapsed ? "Развернуть" : "Свернуть"}
          >
            <span className="flex items-center gap-1 text-xs font-medium tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {isTopCollapsed ? "Название и настройки" : "Свернуть"}
            </span>
            <ChevronUp
              size={18}
              className={`transition-transform duration-300 ease-in-out ${
                isTopCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        )}

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
      collisionDetection={customCollisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {content}
      <DragOverlay zIndex={10001}>
        {activeBook ? (
          <div
            className="shadow-2xl rounded-md overflow-hidden cursor-grabbing select-none"
            style={{
              transform: "rotate(3deg) scale(1.05)",
              willChange: "transform",
            }}
          >
            <BookCover book={activeBook} isDraggable={false} />
          </div>
        ) : activeTier ? (
          <div
            className="flex items-center gap-2 rounded-lg px-4 py-2 shadow-2xl min-w-[200px] cursor-grabbing select-none"
            style={{
              backgroundColor: activeTier.color || "#808080",
              transform: "rotate(1.5deg) scale(1.02)",
              willChange: "transform",
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
