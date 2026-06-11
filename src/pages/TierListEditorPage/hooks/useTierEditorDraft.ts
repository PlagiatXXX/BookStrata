import { useEffect, useCallback } from 'react';
import type { TierListData } from '@/types';
import type { Action } from '@/hooks/useTierList';

interface UseTierEditorDraftParams {
  tierListId: string | undefined;
  listData: TierListData;
  hasUnsavedChanges: boolean;
  dispatch: React.Dispatch<Action>;
  setHasUnsavedChanges: (value: boolean) => void;
  isLoading: boolean;
  sileo: {
    info: (options: {
      title: string;
      description: string;
      duration: number;
      button?: { title: string; onClick: () => void };
    }) => void;
  };
}

export function useTierEditorDraft({
  tierListId,
  listData,
  hasUnsavedChanges,
  dispatch,
  setHasUnsavedChanges,
  isLoading,
  sileo,
}: UseTierEditorDraftParams) {
  const draftKey = `tier-list-draft-${tierListId}`;

  const saveKey = `tier-list-saved-${tierListId}`;

  /** Удалить черновик и записать время успешного сохранения */
  const clearDraft = useCallback(() => {
    try {
      localStorage.setItem(saveKey, String(Date.now()));
    } catch { /* ignore */ }
    localStorage.removeItem(draftKey);
  }, [draftKey, saveKey]);

  // Сохранение черновика при изменениях
  useEffect(() => {
    if (!tierListId || !hasUnsavedChanges) return;

    const saveDraft = () => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          data: listData,
          timestamp: Date.now(),
        }));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          localStorage.removeItem(draftKey);
        }
      }
    };

    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [tierListId, listData, hasUnsavedChanges, draftKey]);

  // Проверка черновика при инициализации
  const checkAndRestoreDraft = useCallback(() => {
    if (!tierListId || isLoading) return;

    const savedDraft = localStorage.getItem(draftKey);
    if (!savedDraft) return;

    try {
      const { data, timestamp } = JSON.parse(savedDraft);
      const lastSavedAt = Number(localStorage.getItem(saveKey)) || 0;

      // Черновик старше последнего успешного сохранения — он устарел
      if (timestamp <= lastSavedAt) {
        localStorage.removeItem(draftKey);
        return;
      }

      const timeAgo = Math.round((Date.now() - timestamp) / 1000 / 60);

      sileo.info({
        title: 'Найден черновик',
        description: `У вас есть несохраненные изменения (${timeAgo} мин. назад). Восстановить?`,
        duration: 10000,
        button: {
          title: 'Восстановить',
          onClick: () => {
            dispatch({ type: 'SET_STATE', payload: data });
            setHasUnsavedChanges(true);
          },
        },
      });
    } catch (e) {
      console.error('Failed to parse draft', e);
      localStorage.removeItem(draftKey);
    }
  }, [tierListId, draftKey, saveKey, dispatch, setHasUnsavedChanges, sileo, listData, isLoading]);

  return { checkAndRestoreDraft, clearDraft };
}
