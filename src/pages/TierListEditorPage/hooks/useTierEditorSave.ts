import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  saveTierListAtomic,
} from "@/lib/tierListApi";
import { getAtomicSavePayload, type AtomicSavePayload } from "@/utils/saveDiff";
import type { TierListData } from "@/types";
import type { Action } from "@/hooks/useTierList";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseTierEditorSaveResult {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  handleSave: () => Promise<void>;
  getSavePayload: () => AtomicSavePayload;
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
    error: (error: Error, context: { tierListId: string; action: string }) => void;
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const getSavePayload = useCallback((): AtomicSavePayload => {
    return getAtomicSavePayload(listData);
  }, [listData]);

  const handleSave = useCallback(async () => {
    if (!tierListId || isLoading || isReadOnly) return;

    setSaveStatus("saving");
    try {
      const payload = getSavePayload();
      const result = await saveTierListAtomic(tierListId, payload);

      setHasUnsavedChanges(false);
      setSaveStatus("saved");
      setLastSaved(new Date());

      // Заменяем временные ID на реальные (атомарно)
      if (result?.bookReplacements?.length) {
        dispatch({
          type: "REPLACE_BOOK_IDS",
          payload: result.bookReplacements,
        });
      }

      if (result?.tierReplacements?.length) {
        dispatch({
          type: "REPLACE_TIER_IDS",
          payload: result.tierReplacements,
        });
      }

      // Очищаем черновик после успешного сохранения
      localStorage.removeItem(`tier-list-draft-${tierListId}`);

      // Обновляем кэш React Query
      queryClient.setQueryData(
        ["tierList", tierListId],
        (old: TierListData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            updatedAt: new Date().toISOString(),
          };
        }
      );
      // Инвалидируем список на дашборде, чтобы там обновилась дата
      await queryClient.invalidateQueries({ queryKey: ["userTierLists"] });

      logger.info("Сохранение успешно", { tierListId });

      // Через 3 секунды возвращаем статус в idle
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      setSaveStatus("error");
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        tierListId,
        action: "manual-save",
      });
    }
  }, [tierListId, isLoading, isReadOnly, getSavePayload, setHasUnsavedChanges, dispatch, queryClient, logger]);

  return {
    saveStatus,
    lastSaved,
    handleSave,
    getSavePayload,
  };
}
