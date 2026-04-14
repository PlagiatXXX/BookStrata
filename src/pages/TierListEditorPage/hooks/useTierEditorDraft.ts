import { useEffect, useCallback } from 'react';
import type { TierListData } from '@/types';
import type { Action } from '@/hooks/useTierList';

interface UseTierEditorDraftParams {
  tierListId: string | undefined;
  listData: TierListData;
  hasUnsavedChanges: boolean;
  dispatch: React.Dispatch<Action>;
  setHasUnsavedChanges: (value: boolean) => void;
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
  sileo,
}: UseTierEditorDraftParams) {
  const draftKey = `tier-list-draft-${tierListId}`;

  // Сохранение черновика при изменениях
  useEffect(() => {
    if (!tierListId || !hasUnsavedChanges) return;

    const saveDraft = () => {
      localStorage.setItem(draftKey, JSON.stringify({
        data: listData,
        timestamp: Date.now(),
      }));
    };

    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [tierListId, listData, hasUnsavedChanges, draftKey]);

  // Проверка черновика при инициализации
  const checkAndRestoreDraft = useCallback(() => {
    if (!tierListId) return;

    const savedDraft = localStorage.getItem(draftKey);
    if (!savedDraft) return;

    try {
      const { data, timestamp } = JSON.parse(savedDraft);

      // Если черновик свежее, чем данные с сервера (упрощенно)
      // В реальности можно сравнивать updatedAt, но для начала предложим пользователю
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
  }, [tierListId, draftKey, dispatch, setHasUnsavedChanges, sileo]);

  return { checkAndRestoreDraft };
}
