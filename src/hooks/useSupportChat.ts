import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetSupportThread,
  apiSendSupportMessage,
  apiMarkSupportThreadRead,
} from "@/lib/supportApi";
import { apiTrackEvent } from "@/lib/analyticsApi";
import type { SupportThreadDto, SupportMessageDto } from "../../shared/types";

export function calculateSupportRefetchInterval(options: {
  isOpen: boolean;
  threadStatus?: string;
  queryError?: boolean;
}): number | false {
  if (options.queryError) return false;
  if (options.isOpen) return 4000;
  // Если пользователь ожидает ответа от поддержки (статус "open") — опрашиваем раз в 8 секунд
  if (options.threadStatus === "open") return 8000;
  // В обычном фоновом режиме опрашиваем раз в минуту
  return 60000;
}

export function useSupportChat(options?: { isChatOpen?: boolean }) {
  const queryClient = useQueryClient();
  const isOpen = options?.isChatOpen ?? false;

  const { data: thread, isLoading, refetch } = useQuery<SupportThreadDto | null>({
    queryKey: ["support-thread"],
    queryFn: () => apiGetSupportThread(),
    retry: 1,
    // Адаптивный опрос: 4с при открытом окне, 8с в ожидании ответа, 60с в обычном фоне
    refetchInterval: (query) => {
      const data = query.state.data as SupportThreadDto | null | undefined;
      return calculateSupportRefetchInterval({
        isOpen,
        threadStatus: data?.status,
        queryError: query.state.status === "error",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (input: { text: string; replyToId?: number }) =>
      apiSendSupportMessage(input),
    onSuccess: (res) => {
      apiTrackEvent("support.message_sent", {
        hasReply: Boolean(res.message.replyToId),
      });
      queryClient.setQueryData<SupportThreadDto | null>(["support-thread"], (old) => {
        if (!old) return res.thread;
        const currentMessages = old.messages || [];
        return {
          ...old,
          ...res.thread,
          messages: [...currentMessages, res.message],
        };
      });
      queryClient.invalidateQueries({ queryKey: ["support-thread"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (threadId: number) => apiMarkSupportThreadRead(threadId),
    onSuccess: () => {
      queryClient.setQueryData<SupportThreadDto | null>(["support-thread"], (old) => {
        if (!old) return null;
        return { ...old, unreadByUser: 0 };
      });
    },
  });

  const markAsRead = () => {
    if (thread?.id && thread.unreadByUser > 0) {
      markReadMutation.mutate(thread.id);
    }
  };

  return {
    thread,
    messages: (thread?.messages as SupportMessageDto[]) || [],
    unreadCount: thread?.unreadByUser || 0,
    isLoading,
    refetch,
    sendMessage: (text: string, replyToId?: number) =>
      sendMutation.mutateAsync({ text, replyToId }),
    isSending: sendMutation.isPending,
    markAsRead,
  };
}
