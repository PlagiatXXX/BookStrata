import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createTierList, saveTierListAtomic } from "@/lib/tierListApi";
import { apiClient } from "@/lib/api-client";
import { getAtomicSavePayload, type AtomicSavePayload } from "@/utils/saveDiff";
import { stableStringify } from "@/utils/stableStringify";
import type { TierListData } from "@/types";
import type { Action } from "@/hooks/useTierList";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseTierEditorSaveResult {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  handleSave: () => Promise<boolean>;
  getSavePayload: () => AtomicSavePayload;
  hasChangesToSave: () => boolean;
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
  theme?: string;
}

/**
 * Преобразует payload в стабильную строку для сравнения.
 * Использует stableStringify — все ключи объектов сортируются,
 * поэтому новое поле в AtomicTierAdd / AtomicTierUpdate / AtomicNewBook
 * автоматически попадёт в сравнение без ручного обновления этой функции.
 */
function serializeSnapshot(payload: AtomicSavePayload): string {
  return stableStringify(payload);
}

export function useTierEditorSave({
  tierListId,
  listData,
  dispatch,
  isLoading,
  isReadOnly,
  setHasUnsavedChanges,
  logger,
  theme = "default",
}: UseTierEditorSaveParams): UseTierEditorSaveResult {
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const savedSnapshotRef = useRef<string | null>(null);
  const prevTierListIdRef = useRef<string | undefined>(undefined);

  const getSavePayload = useCallback((): AtomicSavePayload => {
    return getAtomicSavePayload(listData);
  }, [listData]);

  // Инициализируем snapshot при первой загрузке данных и при смене тир-листа
  useEffect(() => {
    if (!isLoading && listData.id) {
      if (prevTierListIdRef.current !== listData.id) {
        prevTierListIdRef.current = listData.id;
        savedSnapshotRef.current = null;
      }

      if (savedSnapshotRef.current === null) {
        const payload = getAtomicSavePayload(listData);
        savedSnapshotRef.current = serializeSnapshot(payload);
      }
    }
  }, [isLoading, listData]);

  const hasChangesToSave = useCallback((): boolean => {
    const currentPayload = getAtomicSavePayload(listData);
    const currentSerialized = serializeSnapshot(currentPayload);

    if (savedSnapshotRef.current === null) {
      return currentPayload.placements.length > 0;
    }

    return savedSnapshotRef.current !== currentSerialized;
  }, [listData]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!tierListId || isLoading || isReadOnly) return false;

    setSaveStatus("saving");
    try {
      // Определяем, нужно ли создать тир-лист (форк или новый)
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isNumericId = /^\d+$/.test(listData.id);
      const isUuid = UUID_RE.test(listData.id);
      let effectiveId = isNumericId || isUuid ? listData.id : tierListId;

      if (!isNumericId && !isUuid) {
        // Создаём новый тир-лист
        const created = await createTierList(listData.title || "Новый тир-лист");
        effectiveId = String(created.id);

        // Обновляем URL на slug (человекочитаемый), если он есть
        const urlPath = created.slug
          ? `/tier-lists/${created.slug}`
          : `/tier-lists/${effectiveId}`;
        window.history.replaceState(null, "", urlPath);

        // Обновляем ID в данных редактора
        dispatch({
          type: "SET_STATE",
          payload: { ...listData, id: effectiveId, tierIdToTempIdMap: {} },
        });

        // Сохраняем тему, если она выбрана нестандартная
        if (theme && theme !== "default") {
          apiClient.put(`/tier-lists/${effectiveId}`, { theme }).catch(() => {});
        }
      }

      const payload = getSavePayload();
      const result = await saveTierListAtomic(effectiveId, payload);

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

      // Сохраняем snapshot для последующего сравнения
      savedSnapshotRef.current = serializeSnapshot(payload);

      // Обновляем кэш React Query
      await queryClient.invalidateQueries({
        queryKey: ["tierList", tierListId],
      });
      await queryClient.invalidateQueries({ queryKey: ["userTierLists"] });

      logger.info("Сохранение успешно", { tierListId });

      // Через 3 секунды возвращаем статус в idle
      setTimeout(() => setSaveStatus("idle"), 3000);

      return true;
    } catch (error) {
      setSaveStatus("error");
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        tierListId,
        action: "manual-save",
      });
      return false;
    }
  }, [tierListId, isLoading, isReadOnly, getSavePayload, setHasUnsavedChanges, dispatch, queryClient, logger, theme, listData]);

  return {
    saveStatus,
    lastSaved,
    handleSave,
    getSavePayload,
    hasChangesToSave,
  };
}
