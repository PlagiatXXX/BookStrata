import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import type { AutoSaveStatus } from '@/hooks/useAutoSaveOptimized';

export interface UseTierEditorBlockerResult {
  blocker: ReturnType<typeof useBlocker>;
  handleMyRatingsClick: () => void;
  handleSaveBeforeLeave: () => Promise<void>;
  handleConfirmLeave: () => void;
  handleCancelLeave: () => void;
}

interface UseTierEditorBlockerParams {
  isReadOnly: boolean;
  ignoreUnsavedBlocker: boolean;
  hasUnsavedChanges: boolean;
  autoSaveStatus: AutoSaveStatus;
  isUpdatingBook: boolean;
  setShowUnsavedModal: (value: boolean) => void;
  setIgnoreUnsavedBlocker: (value: boolean) => void;
  setDeletedTierIds: React.Dispatch<React.SetStateAction<number[]>>;
  setIsSavingBeforeLeave: (value: boolean) => void;
  cancel: () => void;
  forceSave: () => Promise<void>;
  navigate: (path: string) => void;
  logger: {
    error: (error: Error, context: { action: string }) => void;
  };
  sileo: {
    error: (options: { title: string; description: string; duration: number }) => void;
  };
}

export function useTierEditorBlocker({
  isReadOnly,
  ignoreUnsavedBlocker,
  hasUnsavedChanges,
  autoSaveStatus,
  isUpdatingBook,
  setShowUnsavedModal,
  setIgnoreUnsavedBlocker,
  setDeletedTierIds,
  setIsSavingBeforeLeave,
  cancel,
  forceSave,
  navigate,
  logger,
  sileo,
}: UseTierEditorBlockerParams): UseTierEditorBlockerResult {
  // Предупреждение при закрытии вкладки
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || isUpdatingBook) {
        e.preventDefault();
        e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите обновить страницу?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, isUpdatingBook]);

  const blocker = useBlocker(
    !isReadOnly &&
      !ignoreUnsavedBlocker &&
      (hasUnsavedChanges || autoSaveStatus === 'saving' || isUpdatingBook),
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedModal(true);
    }
  }, [blocker.state, setShowUnsavedModal]);

  const handleMyRatingsClick = () => {
    setDeletedTierIds([]);
    navigate('/');
  };

  const handleSaveBeforeLeave = async () => {
    setIsSavingBeforeLeave(true);
    try {
      cancel();
      await forceSave();
      await new Promise((resolve) => setTimeout(resolve, 500));
      setShowUnsavedModal(false);
      setIgnoreUnsavedBlocker(true);
      blocker.proceed?.();
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        action: 'saveBeforeLeave',
      });
      sileo.error({
        title: 'Не удалось сохранить',
        description: 'Попробуйте выйти без сохранения',
        duration: 3000,
      });
    } finally {
      setIsSavingBeforeLeave(false);
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedModal(false);
    setIgnoreUnsavedBlocker(true);
    blocker.proceed?.();
  };

  const handleCancelLeave = () => {
    setShowUnsavedModal(false);
    setDeletedTierIds([]);
    blocker.reset?.();
  };

  return {
    blocker,
    handleMyRatingsClick,
    handleSaveBeforeLeave,
    handleConfirmLeave,
    handleCancelLeave,
  };
}
