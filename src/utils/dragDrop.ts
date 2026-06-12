/**
 * Чистые функции для логики Drag & Drop тир-листов.
 * Вынесены из useTierList.handleDragEnd для тестируемости.
 */
import type { DragEndEvent } from "@dnd-kit/core";
import type { TierListData } from "@/types";
import { UNRANKED_AREA_ID } from "@/constants/dnd";

// ─── Типы ────────────────────────────────────────────

export interface DestContainerResult {
  /** ID контейнера назначения (tierId или UNRANKED_AREA_ID) */
  containerId: string | undefined;
}

export interface DestIndexParams {
  active: DragEndEvent["active"];
  over: NonNullable<DragEndEvent["over"]>;
  sourceContainer: string;
  destContainer: string;
  sourceIndex: number;
  /** Список книг в контейнере назначения */
  destItems: string[];
}

export interface DragEndBookMove {
  type: "book";
  sourceContainer: string;
  destContainer: string;
  sourceIndex: number;
  destIndex: number;
}

export interface DragEndTierReorder {
  type: "tier";
  activeId: string;
  overId: string;
}

export type DragEndAction = DragEndBookMove | DragEndTierReorder | null;

// ─── Функции ──────────────────────────────────────────

/**
 * Определяет эффективный overId:
 * - если over — книга, возвращаем containerId (родительский tier/unranked)
 * - иначе возвращаем строковое представление over.id
 */
export function resolveOverId(
  over: NonNullable<DragEndEvent["over"]>,
): string {
  return over.data.current?.type === "book"
    ? (over.data.current.containerId as string)
    : String(over.id);
}

/**
 * Определяет, является ли действие перестановкой тиров.
 */
export function isTierReorder(
  activeId: string,
  overId: string,
  tierOrder: string[],
): boolean {
  return tierOrder.includes(activeId) && tierOrder.includes(overId);
}

/**
 * Определяет контейнер назначения для книги.
 */
export function resolveDestContainer(
  over: NonNullable<DragEndEvent["over"]>,
  overId: string,
  listData: TierListData,
): string | undefined {
  if (over.data.current?.type === "book") {
    return over.data.current.containerId as string;
  }
  if (listData.tiers[overId]) {
    return overId;
  }
  if (overId === UNRANKED_AREA_ID) {
    return UNRANKED_AREA_ID;
  }
  return undefined;
}

/**
 * Рассчитывает индекс вставки книги.
 *
 * Использует пиксельную точность dnd-kit: если книга перетаскивается
 * на другую книгу, определяет, вставить ДО или ПОСЛЕ неё,
 * сравнивая центры активной и целевой книги по горизонтали.
 */
export function calculateDestIndex(params: DestIndexParams): number {
  const { active, over, sourceContainer, destContainer, destItems } = params;

  const overIndex = over.data.current?.sortable?.index;
  const activeRect = active.rect?.current?.translated || null;
  const overRect = over.rect || null;

  // Если перетаскиваем на книгу
  if (over.data.current?.type === "book" && typeof overIndex === "number") {
    // Внутри одного контейнера — точно определяем позицию
    if (sourceContainer === destContainer) {
      if (activeRect && overRect) {
        const insertAfter =
          activeRect.left + activeRect.width / 2 >
          overRect.left + overRect.width / 2;
        return (
          overIndex +
          (params.sourceIndex < overIndex
            ? insertAfter
              ? 0
              : -1
            : insertAfter
              ? 1
              : 0)
        );
      }
      return overIndex;
    }

    // Между разными контейнерами
    if (activeRect && overRect) {
      const insertAfter =
        activeRect.left + activeRect.width / 2 >
        overRect.left + overRect.width / 2;
      return overIndex + (insertAfter ? 1 : 0);
    }
    return overIndex;
  }

  // Если перетаскиваем на контейнер (не на книгу) — в конец
  return destItems.length;
}

/**
 * Проверяет, является ли перемещение фиктивным (без изменений).
 */
export function isNoopMove(
  sourceContainer: string,
  destContainer: string,
  sourceIndex: number,
  destIndex: number,
  over: NonNullable<DragEndEvent["over"]>,
  destItems: string[],
): boolean {
  // Если книга осталась на том же месте
  if (sourceContainer === destContainer && sourceIndex === destIndex) {
    return true;
  }

  // Если книгу бросили на сам контейнер (не на книгу) и она уже была последней
  if (
    sourceContainer === destContainer &&
    over.data.current?.type !== "book" &&
    destIndex === sourceIndex + 1 &&
    sourceIndex === destItems.length - 1
  ) {
    return true;
  }

  return false;
}

/**
 * Главная функция: анализирует DragEndEvent и возвращает действие,
 * которое нужно выполнить, или null (если ничего не изменилось).
 */
export function getDragEndAction(
  event: DragEndEvent,
  listData: TierListData,
): DragEndAction {
  const { active, over } = event;

  if (!over || active.id === over.id) return null;

  const activeId = String(active.id);
  const overId = resolveOverId(over);

  // ── Сценарий 1: Перестановка тиров ──
  if (isTierReorder(activeId, overId, listData.tierOrder)) {
    return {
      type: "tier",
      activeId,
      overId,
    };
  }

  // ── Сценарий 2: Перемещение книги ──
  const activeIsBook = active.data.current?.type === "book";
  if (!activeIsBook) return null;

  const sourceContainer = active.data.current?.containerId as string | undefined;
  const destContainer = resolveDestContainer(over, overId, listData);

  if (!sourceContainer || !destContainer) return null;

  const sourceIndex = active.data.current?.sortable?.index;
  if (typeof sourceIndex !== "number") return null;

  const destItems =
    destContainer === UNRANKED_AREA_ID
      ? listData.unrankedBookIds
      : listData.tiers[destContainer]?.bookIds ?? [];

  const destIndex = calculateDestIndex({
    active,
    over,
    sourceContainer,
    destContainer,
    sourceIndex,
    destItems,
  });

  if (
    isNoopMove(
      sourceContainer,
      destContainer,
      sourceIndex,
      destIndex,
      over,
      destItems,
    )
  ) {
    return null;
  }

  return {
    type: "book",
    sourceContainer,
    destContainer,
    sourceIndex,
    destIndex,
  };
}
