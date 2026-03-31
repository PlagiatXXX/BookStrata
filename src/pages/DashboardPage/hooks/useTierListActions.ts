import { useMutation } from '@tanstack/react-query';
import { sileo } from 'sileo';
import {
  createTierList,
  updateTierListTitle,
  deleteTierList,
} from '@/lib/api';
import { createLogger } from '@/lib/logger';

// Логгер для хука действий тир-листов
const logger = createLogger('TierListActions', { color: 'magenta' });

interface UseTierListActionsOptions {
  onSuccess?: () => void;
  onRefetch?: () => void;
}

interface UseTierListActionsReturn {
  createNewTierList: (title: string) => void;
  renameTierList: (id: number, title: string) => void;
  removeTierList: (id: number) => void;
  isCreating: boolean;
  isRenaming: boolean;
  isDeleting: boolean;
}

/**
 * Хук для CRUD операций с тир-листами
 * Инкапсулирует useMutation и обработку ошибок
 */
export function useTierListActions({
  onSuccess,
  onRefetch,
}: UseTierListActionsOptions): UseTierListActionsReturn {
  const { mutate: createNewTierList, isPending: isCreating } = useMutation({
    mutationFn: (title: string) => createTierList(title),
    onSuccess: (tierList) => {
      logger.info('New tier list created - navigating to editor', {
        id: tierList.id,
        title: tierList.title,
      });
      onSuccess?.();
      onRefetch?.();
    },
    onError: (mutationError) => {
      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: 'createTierList' },
      );
      sileo.error({
        title: 'Ошибка создания',
        description: mutationError instanceof Error ? mutationError.message : 'Не удалось создать тир-лист',
        duration: 3000
      });
    },
  });

  const { mutateAsync: renameMutation, isPending: isRenaming } = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      updateTierListTitle(String(id), title),
    onSuccess: () => {
      logger.info('Tier list renamed successfully');
      onSuccess?.();
      onRefetch?.();
    },
    onError: (mutationError) => {
      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: 'renameTierList' },
      );
      sileo.error({
        title: 'Ошибка переименования',
        description: mutationError instanceof Error ? mutationError.message : 'Не удалось переименовать тир-лист',
        duration: 3000
      });
    },
  });

  const { mutateAsync: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => deleteTierList(String(id)),
    onSuccess: () => {
      logger.info('Tier list deleted successfully');
      onSuccess?.();
      onRefetch?.();
    },
    onError: (mutationError) => {
      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: 'deleteTierList' },
      );
      sileo.error({
        title: 'Ошибка удаления',
        description: mutationError instanceof Error ? mutationError.message : 'Не удалось удалить тир-лист',
        duration: 3000
      });
    },
  });

  const renameTierList = (id: number, title: string) => {
    renameMutation({ id, title });
  };

  const removeTierList = (id: number) => {
    deleteMutation(id);
  };

  return {
    createNewTierList,
    renameTierList,
    removeTierList,
    isCreating,
    isRenaming,
    isDeleting,
  };
}
