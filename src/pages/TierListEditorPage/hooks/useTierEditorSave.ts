import { useCallback, useEffect, useRef, useState } from "react";
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
  hasChangesToSave: () => boolean;
}

function serializePayload(payload: AtomicSavePayload): string {
  return JSON.stringify({
    tiers: {
      added: payload.tiers.added.sort((a, b) => a.tempId.localeCompare(b.tempId)),
      updated: payload.tiers.updated.sort((a, b) => a.id - b.id),
      deletedIds: payload.tiers.deletedIds.sort((a, b) => a - b),
    },
    newBooks: payload.newBooks.sort((a, b) => a.tempId.localeCompare(b.tempId)),
    placements: payload.placements.sort((a, b) => {
      const aKey = `${a.bookId}-${a.tierId}-${a.rank}`;
      const bKey = `${b.bookId}-${b.tierId}-${b.rank}`;
      return aKey.localeCompare(bKey);
    }),
  });
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
  const savedSnapshotRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const getSavePayload = useCallback((): AtomicSavePayload => {
    return getAtomicSavePayload(listData);
  }, [listData]);

  // Инициализируем snapshot при первой загрузке данных
  useEffect(() => {
    if (!isLoading && !initializedRef.current && listData.id) {
      const payload = getAtomicSavePayload(listData);
      savedSnapshotRef.current = serializePayload(payload);
      initializedRef.current = true;
    }
  }, [isLoading, listData.id, listData, getSavePayload]);

  // Сбрасываем snapshot при смене тир-листа
  useEffect(() => {
    initializedRef.current = false;
    savedSnapshotRef.current = null;
  }, [tierListId]);

  

  const hasChangesToSave = useCallback((): boolean => {
    const currentPayload = getAtomicSavePayload(listData);
    const currentSerialized = serializePayload(currentPayload);

    if (savedSnapshotRef.current === null) {
      return currentPayload.placements.length > 0;
    }

    return savedSnapshotRef.current !== currentSerialized;
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
      localStorage.setItem(`tier-list-saved-${tierListId}`, String(Date.now()));

      // Сохраняем snapshot для последующего сравнения
      savedSnapshotRef.current = serializePayload(payload);

      // Обновляем кэш React Query — инвалидируем чтобы данные перезапросились
      await queryClient.invalidateQueries({
        queryKey: ["tierList", tierListId],
      });
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
    hasChangesToSave,
  };
}
