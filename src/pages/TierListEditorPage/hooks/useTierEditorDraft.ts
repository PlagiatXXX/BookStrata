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
    }) => string;
    dismiss: (id: string) => void;
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
  const offeredKey = `tier-list-draft-offered-${tierListId}`;
  const saveKey = `tier-list-saved-${tierListId}`;

  /** Удалить черновик и записать время успешного сохранения */
  const clearDraft = useCallback(() => {
    try {
      localStorage.setItem(saveKey, String(Date.now()));
    } catch { /* ignore */ }
    localStorage.removeItem(draftKey);
    localStorage.removeItem(offeredKey);
  }, [draftKey, offeredKey, saveKey]);

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

      // Черновик только что записан (младше 5 секунд) — это наш собственный
      // автосохранённый черновик, не предлагаем восстановление
      if (Date.now() - timestamp < 5000) return;

      // Если мы уже предлагали этот черновик (тот же timestamp) — не показываем снова
      const lastOffered = Number(localStorage.getItem(offeredKey)) || 0;
      if (lastOffered === timestamp) return;

      // Запоминаем, что предложили этот черновик
      try {
        localStorage.setItem(offeredKey, String(timestamp));
      } catch { /* ignore */ }

      const timeAgo = Math.round((Date.now() - timestamp) / 1000 / 60);

      const toastId = sileo.info({
        title: 'Найден черновик',
        description: `У вас есть несохраненные изменения (${timeAgo} мин. назад). Восстановить?`,
        duration: 10000,
        button: {
          title: 'Восстановить',
          onClick: () => {
            dispatch({ type: 'SET_STATE', payload: data });
            setHasUnsavedChanges(true);
            sileo.dismiss(toastId);
          },
        },
      });
    } catch (e) {
      console.error('Failed to parse draft', e);
      localStorage.removeItem(draftKey);
    }
  }, [tierListId, draftKey, offeredKey, saveKey, dispatch, setHasUnsavedChanges, sileo, isLoading]);

  return { checkAndRestoreDraft, clearDraft };
}
