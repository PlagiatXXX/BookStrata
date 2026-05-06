import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTierList, updateTierListTitle, deleteTierList, type PaginatedTierListsResponse } from "@/lib/tierListApi";
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
    onSuccess: async (tierList) => {
      logger.info("New tier list created - navigating to editor", {
        id: tierList.id,
        title: tierList.title,
      });
      // Инвалидируем кэш статистики пользователя
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user", "stats"] }),
        queryClient.invalidateQueries({ queryKey: ["userTierLists"] })
      ]);
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
    onMutate: async ({ id, title }) => {
      // Отменяем исходящие рефетчи, чтобы они не перетерли оптимистичное обновление
      await queryClient.cancelQueries({ queryKey: ["userTierLists"] });

      // Сохраняем текущее состояние для отката
      const previousTierLists = queryClient.getQueryData(["userTierLists"]);

      // Оптимистично обновляем название в кэше
      queryClient.setQueriesData({ queryKey: ["userTierLists"] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((item: any) =>
            String(item.id) === String(id) ? { ...item, title } : item
          )
        };
      });

      return { previousTierLists };
    },
    onSuccess: async () => {
      logger.info("Tier list renamed successfully");
      onSuccess?.();
    },
    onError: (mutationError, variables, context) => {
      // Откат при ошибке
      if (context?.previousTierLists) {
        queryClient.setQueryData(["userTierLists"], context.previousTierLists);
      }

      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: "renameTierList" },
      );
    },
    onSettled: () => {
      // Синхронизируем с сервером в любом случае
      queryClient.invalidateQueries({ queryKey: ["userTierLists"] });
      onRefetch?.();
    },
    throwOnError: false,
  });

  const { mutateAsync: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteTierList(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["userTierLists"] });
      const previousTierLists = queryClient.getQueryData(["userTierLists"]);

      // Оптимистично удаляем из списка
      queryClient.setQueriesData({ queryKey: ["userTierLists"] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.filter((item: any) => String(item.id) !== String(id))
        };
      });

      return { previousTierLists };
    },
    onSuccess: async () => {
      logger.info("Tier list deleted successfully");
      onSuccess?.();
    },
    onError: (mutationError, id, context) => {
      if (context?.previousTierLists) {
        queryClient.setQueryData(["userTierLists"], context.previousTierLists);
      }

      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: "deleteTierList" },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["userTierLists"] });
      onRefetch?.();
    },
    throwOnError: false,
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
