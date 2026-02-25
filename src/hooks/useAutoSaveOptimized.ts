import { useEffect, useRef, useCallback, useState } from 'react';
import { logger } from '@/lib/logger';

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
  const payloadRef = useRef<SavePayload | null>(null);
  const forceSaveRequested = useRef(false); // Флаг для принудительного сохранения

  // Функция сохранения
  const executeSave = useCallback(async (isForceSave = false) => {
    if (!listId || !enabled) {
      setHasPendingChanges(true);
      return;
    }

    // Если уже сохраняется и это не forceSave, откладываем сохранение
    if (isSavingRef.current && !isForceSave) {
      setHasPendingChanges(true);
      return;
    }

    // Если это forceSave и уже идёт сохранение, ждём завершения
    if (isSavingRef.current && isForceSave) {
      forceSaveRequested.current = true;
      return;
    }

    isSavingRef.current = true;
    setStatus('saving');

    const payload = getSavePayload();

    // Если skipNewBooks = true, убираем newBooks из автосохранения
    const savePayload = skipNewBooks 
      ? { ...payload, newBooks: undefined }
      : payload;

    // Проверяем, есть ли что сохранять
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
      return;
    }

    logger.info('Auto-save started', {
      listId,
      placementsCount: savePayload.placements?.length || 0,
      hasTiers: !!savePayload.tiers,
      newBooksCount: savePayload.newBooks?.length || 0,
      skipNewBooks,
      isForceSave,
    });

    try {
      await saveFunction(savePayload);

      setStatus('saved');
      setLastSaved(new Date());
      retryCount.current = 0;
      isSavingRef.current = false;
      setHasPendingChanges(false);
      payloadRef.current = null;

      logger.info('Auto-save completed', { listId });

      // Если был запрошен forceSave пока шло сохранение, выполняем его
      if (forceSaveRequested.current) {
        forceSaveRequested.current = false;
        setTimeout(() => executeSave(true), 100);
        return;
      }

      // Если пока сохраняли, появились новые изменения — сохраняем ещё раз
      if (payloadRef.current) {
        setTimeout(executeSave, 100);
      }
    } catch (error) {
      retryCount.current += 1;
      isSavingRef.current = false;

      if (retryCount.current < maxRetries) {
        logger.warn(`Auto-save failed, retry ${retryCount.current}/${maxRetries}`);
        setStatus('saving');
        timeoutRef.current = setTimeout(executeSave, 1000);
      } else {
        setStatus('error');
        retryCount.current = 0;
        logger.error(error instanceof Error ? error : new Error(String(error)), { 
          action: 'auto-save',
          listId,
        });
      }
    }
  }, [listId, enabled, getSavePayload, saveFunction, skipNewBooks]);

  // Debounce эффект
  useEffect(() => {
    if (!enabled || !listId) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setHasPendingChanges(true);
    timeoutRef.current = setTimeout(executeSave, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, delay, enabled, getSavePayload]);

  // Принудительное сохранение
  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Если уже идёт сохранение, помечаем что нужен forceSave после завершения
    if (isSavingRef.current) {
      forceSaveRequested.current = true;
      // Ждём завершения текущего сохранения
      while (isSavingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    await executeSave(true);
  }, [executeSave]);

  // Отмена автосохранения
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isSavingRef.current) {
      logger.info('Auto-save cancelled');
    }
  }, []);

  // Очистка при unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    lastSaved,
    forceSave,
    cancel,
    hasPendingChanges,
  };
};
