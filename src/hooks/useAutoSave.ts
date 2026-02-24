import { useEffect, useRef, useCallback, useState } from 'react';
import type { TierListData } from '@/types';
import { logger } from '@/lib/logger';

// Утилита для конвертации ошибок в Error
const toError = (e: unknown): Error => {
  if (e instanceof Error) return e;
  return new Error(String(e));
};

// Типы для индикатора статуса
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface UseAutoSaveOptions {
  data: TierListData;
  saveFunction: (data: TierListData) => Promise<void>;
  delay?: number; // Задержка в мс (по умолчанию 2000мс = 2 сек)
  enabled?: boolean; // Включено ли автосохранение
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  forceSave: () => void;
  setEnabled: (enabled: boolean) => void;
}

/**
 * Хук для автосохранения с debounce
 * @param options - параметры автосохранения
 * @returns объект с состоянием и функциями управления
 */
export const useAutoSave = ({
  data,
  saveFunction,
  delay = 2000,
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn => {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isEnabled, setIsEnabled] = useState(enabled);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const dataRef = useRef(data);
  
  // Обновляем ref при изменении data
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Функция сохранения с retry
  const executeSaveRef = useRef<() => void>(() => {});

  useEffect(() => {
    const doSave = async () => {
      if (!isEnabled || status === 'saving') return;

      setStatus('saving');
      logger.info('Auto-save triggered', { hasData: !!dataRef.current });

      try {
        await saveFunction(dataRef.current);
        setStatus('saved');
        setLastSaved(new Date());
        retryCount.current = 0;
        logger.info('Auto-save completed successfully');
      } catch (error) {
        retryCount.current += 1;
        
        if (retryCount.current < maxRetries) {
          // Retry через 1 секунду
          logger.warn(`Auto-save failed, retry ${retryCount.current}/${maxRetries}`);
          setStatus('saving');
          timeoutRef.current = setTimeout(() => {
            executeSaveRef.current();
          }, 1000);
        } else {
          setStatus('error');
          retryCount.current = 0;
          logger.error(toError(error), { retryCount: retryCount.current });
        }
      }
    };

    executeSaveRef.current = doSave;
  }, [saveFunction, isEnabled, status]);

  // Debounce эффект - запускаем сохранение через delay после изменения data
  useEffect(() => {
    if (!isEnabled || status === 'saving') return;

    // Очищаем предыдущий таймер
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Устанавливаем новый таймер
    timeoutRef.current = setTimeout(executeSaveRef.current, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, isEnabled, status]);

  // Принудительное сохранение
  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    executeSaveRef.current();
  }, []);

  // Изменение enabled
  const setEnabled = useCallback((newEnabled: boolean) => {
    setIsEnabled(newEnabled);
    if (newEnabled && status === 'error') {
      // Если было ошибка, сбрасываем статус
      setStatus('idle');
    }
  }, [status]);

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
    setEnabled,
  };
};

/**
 * Утилита для форматирования времени последнего сохранения
 */
export const formatLastSaved = (date: Date | null): string => {
  if (!date) return 'Не сохранено';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return `Сохранено ${diffSec} сек. назад`;
  }
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `Сохранено ${diffMin} мин. назад`;
  }
  
  return `Сохранено в ${date.toLocaleTimeString()}`;
};

/**
 * Хук для localStorage fallback
 */
export const useLocalStorageBackup = (
  tierListId: string,
  data: TierListData | null,
  status: AutoSaveStatus,
  lastSaved: Date | null,
) => {
  const STORAGE_KEY = `tierlist_backup_${tierListId}`;

  // Сохраняем в localStorage при успешном сохранении
  useEffect(() => {
    if (status === 'saved' && data && tierListId) {
      try {
        const backup = {
          data,
          timestamp: lastSaved?.toISOString(),
          version: 1,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
        logger.info('Backup saved to localStorage', { key: STORAGE_KEY });
      } catch (error) {
        logger.warn('Failed to save backup to localStorage', { error });
      }
    }
  }, [status, data, lastSaved, tierListId, STORAGE_KEY]);

  // Функция восстановления из localStorage
  const restoreFromBackup = useCallback((): TierListData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const backup = JSON.parse(stored);
        if (backup.data && backup.timestamp) {
          logger.info('Backup restored from localStorage', { 
            timestamp: backup.timestamp 
          });
          return backup.data;
        }
      }
    } catch (error) {
      logger.error(toError(error), { action: 'restoreFromBackup' });
    }
    return null;
  }, [STORAGE_KEY]);

  // Функция очистки backup
  const clearBackup = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    logger.info('Backup cleared from localStorage', { key: STORAGE_KEY });
  }, [STORAGE_KEY]);

  return { restoreFromBackup, clearBackup };
};
