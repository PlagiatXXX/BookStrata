import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTierList, updateTierListTitle, deleteTierList } from "@/lib/tierListApi";
import { createLogger } from "@/lib/logger";

// Логгер для хука действий тир-листов
const logger = createLogger("TierListActions", { color: "magenta" });

interface UseTierListActionsOptions {
  onSuccess?: () => void;
  onRefetch?: () => void;
}

interface UseTierListActionsReturn {
  createNewTierList: (title: string) => void;
  renameTierList: (id: string, title: string) => void;
  removeTierList: (id: string) => void;
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
  const queryClient = useQueryClient();

  const { mutate: createNewTierList, isPending: isCreating } = useMutation({
    mutationFn: (title: string) => createTierList(title),
    onSuccess: (tierList) => {
      logger.info("New tier list created - navigating to editor", {
        id: tierList.id,
        title: tierList.title,
      });
      // Инвалидируем кэш статистики пользователя
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
      onSuccess?.();
      onRefetch?.();
    },
    onError: (mutationError) => {
      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: "createTierList" },
      );
      alert(
        `Ошибка: ${mutationError instanceof Error ? mutationError.message : "Unknown error"}`,
      );
    },
  });

  const { mutateAsync: renameMutation, isPending: isRenaming } = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateTierListTitle(id, title),
    onSuccess: () => {
      logger.info("Tier list renamed successfully");
      onSuccess?.();
      onRefetch?.();
    },
    onError: (mutationError) => {
      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: "renameTierList" },
      );
      alert(
        `Ошибка: ${mutationError instanceof Error ? mutationError.message : "Unknown error"}`,
      );
    },
    throwOnError: false, // Не выбрасывать ошибку
  });

  const { mutateAsync: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteTierList(id),
    onSuccess: () => {
      logger.info("Tier list deleted successfully");
      // Инвалидируем кэш статистики пользователя
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
      onSuccess?.();
      onRefetch?.();
    },
    onError: (mutationError) => {
      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: "deleteTierList" },
      );
      alert(
        `Ошибка: ${mutationError instanceof Error ? mutationError.message : "Unknown error"}`,
      );
    },
    throwOnError: false, // Не выбрасывать ошибку
  });

  const renameTierList = (id: string, title: string) => {
    renameMutation({ id, title });
  };

  const removeTierList = (id: string) => {
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
