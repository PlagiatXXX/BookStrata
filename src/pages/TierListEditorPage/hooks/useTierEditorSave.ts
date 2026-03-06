import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAutoSaveOptimized } from '@/hooks/useAutoSaveOptimized';
import { saveTierListOptimized, type SaveTierListPayload } from '@/lib/tierListApi';
import { getPlacementsDiff, getTiersDiff, getNewBooks } from '@/utils/saveDiff';
import type { TierListData } from '@/types';
import type { Action } from '@/hooks/useTierList';

export interface UseTierEditorSaveResult {
  autoSaveStatus: ReturnType<typeof useAutoSaveOptimized>['status'];
  lastSaved: ReturnType<typeof useAutoSaveOptimized>['lastSaved'];
  forceSave: ReturnType<typeof useAutoSaveOptimized>['forceSave'];
  cancel: ReturnType<typeof useAutoSaveOptimized>['cancel'];
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
      tiers: (tiers.added.length > 0 || tiers.updated.length > 0) ? tiers : undefined,
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
        dispatch({ type: 'REPLACE_BOOK_IDS', payload: result.bookReplacements });
      }

      // Инвалидируем кэш чтобы загрузить актуальные данные
      queryClient.invalidateQueries({ queryKey: ['tierList', tierListId] });

      logger.info('Сохранение успешно', { tierListId });
    },
    [tierListId, queryClient, dispatch, listData, setHasUnsavedChanges, logger],
  );

  const { status: autoSaveStatus, lastSaved, forceSave, cancel } = useAutoSaveOptimized({
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
