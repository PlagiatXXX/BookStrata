import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAutoSaveOptimized } from "@/hooks/useAutoSaveOptimized";
import {
  saveTierListOptimized,
  type SaveTierListPayload,
} from "@/lib/tierListApi";
import { getPlacementsDiff, getTiersDiff, getNewBooks } from "@/utils/saveDiff";
import type { TierListData } from "@/types";
import type { Action } from "@/hooks/useTierList";

export interface UseTierEditorSaveResult {
  autoSaveStatus: ReturnType<typeof useAutoSaveOptimized>["status"];
  lastSaved: ReturnType<typeof useAutoSaveOptimized>["lastSaved"];
  forceSave: ReturnType<typeof useAutoSaveOptimized>["forceSave"];
  cancel: ReturnType<typeof useAutoSaveOptimized>["cancel"];
  getSavePayload: () => SaveTierListPayload;
  savePayload: (payload: SaveTierListPayload) => Promise<void>;
}

interface UseTierEditorSaveParams {
  tierListId: string | undefined;
  listData: TierListData;
  dispatch: React.Dispatch<Action>;
  isLoading: boolean;
  isReadOnly: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  logger: {
    info: (message: string, context: { tierListId: string }) => void;
  };
}

export function useTierEditorSave({
  tierListId,
  listData,
  dispatch,
  isLoading,
  isReadOnly,
  setHasUnsavedChanges,
  logger,
}: UseTierEditorSaveParams): UseTierEditorSaveResult {
  const queryClient = useQueryClient();

  const getSavePayload = useCallback((): SaveTierListPayload => {
    if (!listData.id) return {};

    const placements = getPlacementsDiff(listData);
    const tiers = getTiersDiff(listData);
    const newBooks = getNewBooks(listData);

    return {
      placements: placements.length > 0 ? placements : undefined,
      tiers:
        tiers.added.length > 0 || tiers.updated.length > 0 ? tiers : undefined,
      newBooks: newBooks.length > 0 ? newBooks : undefined,
    };
  }, [listData]);

  const savePayload = useCallback(
    async (payload: SaveTierListPayload) => {
      if (!tierListId) return;

      const result = await saveTierListOptimized(tierListId, payload, listData);
      setHasUnsavedChanges(false);

      // Если были созданы новые книги, заменяем временные ID на реальные
      if (result?.bookReplacements && result.bookReplacements.length > 0) {
        dispatch({
          type: "REPLACE_BOOK_IDS",
          payload: result.bookReplacements,
        });
      }

      // Если были созданы новые тиры, заменяем временные ID на реальные
      if (result?.tierReplacements && result.tierReplacements.length > 0) {
        dispatch({
          type: "REPLACE_TIER_IDS",
          payload: result.tierReplacements,
        });
      }

      // Обновляем кэш оптимистично без лишнего GET-запроса
      // Это убирает избыточный запрос GET /api/tier-lists/:id после сохранения
      queryClient.setQueryData(
        ["tierList", tierListId],
        (old: TierListData | undefined) => {
          if (!old) return old;

          // Собираем bookIds из тиров для восстановления unrankedBookIds
          const booksInTiers = new Set<string>();
          if (old.tiers) {
            Object.values(old.tiers).forEach((tier) => {
              if (tier.bookIds) {
                tier.bookIds.forEach((bookId) => booksInTiers.add(bookId));
              }
            });
          }

          // Вычисляем unranked книги (те, что были в unrankedBookIds, но не попали в тиры)
          const newUnrankedBookIds = (old.unrankedBookIds || []).filter(
            (bookId) => !booksInTiers.has(bookId),
          );

          return {
            ...old,
            unrankedBookIds: newUnrankedBookIds,
            updatedAt: new Date().toISOString(),
          };
        },
      );

      logger.info("Сохранение успешно", { tierListId });
    },
    [tierListId, queryClient, dispatch, listData, setHasUnsavedChanges, logger],
  );

  const {
    status: autoSaveStatus,
    lastSaved,
    forceSave,
    cancel,
  } = useAutoSaveOptimized({
    listId: tierListId || null,
    getSavePayload,
    saveFunction: savePayload,
    delay: 3000, // 3 секунды
    enabled: !isLoading && !!listData.id && !isReadOnly,
    skipNewBooks: false, // Сохраняем и новые книги тоже!
  });

  return {
    autoSaveStatus,
    lastSaved,
    forceSave,
    cancel,
    getSavePayload,
    savePayload,
  };
}
