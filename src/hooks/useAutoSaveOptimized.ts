import { useEffect, useRef, useCallback, useState } from 'react';
import { createLogger } from '@/lib/logger';

// Логгер для хука автосохранения
const logger = createLogger('AutoSave', { color: 'cyan' });

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SavePayload {
  placements?: { bookId: number; tierId: number | null; rank: number }[];
  tiers?: Array<{ id?: number; title: string; color: string; rank: number }> | {
    added: Array<{ title: string; color: string; rank: number }>;
    updated: Array<{ id: number; title: string; color: string; rank: number }>;
    deletedIds: number[];
  };
  newBooks?: Array<{
    id: string;
    title: string;
    author?: string;
    coverImageUrl: string;
    description?: string;
    thoughts?: string;
  }>;
}

interface UseAutoSaveOptimizedOptions {
  listId: string | null;
  getSavePayload: () => SavePayload; // Возвращает только изменения
  saveFunction: (payload: SavePayload) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  skipNewBooks?: boolean; // Не сохранять новые книги через автосохранение
}

interface UseAutoSaveOptimizedReturn {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  forceSave: () => Promise<void>;
  cancel: () => void;
  hasPendingChanges: boolean;
}

/**
 * Оптимизированный хук автосохранения
 * Отправляет только изменения (diff), а не все данные
 */
export const useAutoSaveOptimized = ({
  listId,
  getSavePayload,
  saveFunction,
  delay = 2000,
  enabled = true,
  skipNewBooks = false, // По умолчанию false для обратной совместимости
}: UseAutoSaveOptimizedOptions): UseAutoSaveOptimizedReturn => {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const isSavingRef = useRef(false);
  const needsSubsequentSaveRef = useRef(false);
  const forceSaveRequested = useRef(false);
  const executeSaveRef = useRef<((isForceSave?: boolean) => Promise<void>) | null>(null);

  // Функция сохранения
  const executeSave = useCallback(async (isForceSave = false) => {
    if (!listId || !enabled) {
      return;
    }

    // Если уже сохраняется, помечаем, что нужно сохранить еще раз после завершения
    if (isSavingRef.current) {
      needsSubsequentSaveRef.current = true;
      if (isForceSave) {
      forceSaveRequested.current = true;
      }
      return;
    }

    isSavingRef.current = true;
    setStatus('saving');

    const payload = getSavePayload();

    const savePayload = skipNewBooks 
      ? { ...payload, newBooks: undefined }
      : payload;

    const hasData =
      (savePayload.placements && savePayload.placements.length > 0) ||
      (savePayload.tiers && (
        Array.isArray(savePayload.tiers) ? savePayload.tiers.length > 0 :
        (savePayload.tiers.added?.length || savePayload.tiers.updated?.length || savePayload.tiers.deletedIds?.length)
      )) ||
      (savePayload.newBooks && savePayload.newBooks.length > 0);

    if (!hasData) {
      isSavingRef.current = false;
      setHasPendingChanges(false);
      setStatus('idle');
      return;
    }

    logger.info('Auto-save started', {
      tierListId: listId,
      isForceSave,
    });

    try {
      await saveFunction(savePayload);

      setStatus('saved');
      setLastSaved(new Date());
      retryCount.current = 0;
      isSavingRef.current = false;
      setHasPendingChanges(false);

// Если за время сохранения появились новые изменения или был forceSave
      if (needsSubsequentSaveRef.current || forceSaveRequested.current) {
        const isNextForce = forceSaveRequested.current;
        needsSubsequentSaveRef.current = false;
        forceSaveRequested.current = false;
        setTimeout(() => executeSaveRef.current?.(isNextForce), 200);
      }
    } catch (error) {
      retryCount.current += 1;
      isSavingRef.current = false;

      if (retryCount.current < maxRetries) {
        logger.warn(`Auto-save failed, retry ${retryCount.current}/${maxRetries}`);
        setStatus('saving');
        timeoutRef.current = setTimeout(() => executeSaveRef.current?.(), 1000);
      } else {
        setStatus('error');
        retryCount.current = 0;
        logger.error(error instanceof Error ? error : new Error(String(error)), {
          action: 'auto-save',
          tierListId: listId,
        });
      }
    }
  }, [listId, enabled, getSavePayload, saveFunction, skipNewBooks]);

  // Сохраняем ссылку на executeSave для рекурсивных вызовов
  useEffect(() => {
    executeSaveRef.current = executeSave;
  }, [executeSave]);

  // Debounce эффект
  useEffect(() => {
    if (!enabled || !listId) return;

    setHasPendingChanges(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      executeSaveRef.current?.();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [listId, delay, enabled, getSavePayload]);

  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    await executeSave(true);
  }, [executeSave]);

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    };


  return {
    status,
    lastSaved,
    forceSave,
    cancel,
    hasPendingChanges,
  };
};
