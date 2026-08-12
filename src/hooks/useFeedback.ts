import { apiClient } from "@/lib/api-client";
import { useInfiniteQuery } from "@tanstack/react-query";

export interface FeedbackItem {
  id: number;
  type: string;
  status: string;
  message: string;
  pageUrl: string | null;
  userEmail: string | null;
  userId: number | null;
  user: { id: number; username: string | null; avatarUrl: string | null } | null;
  createdAt: string;
}

const FEEDBACK_PAGE_SIZE = 50;

export function useFeedback() {
  return useInfiniteQuery<FeedbackItem[]>({
    queryKey: ["feedback"],
    queryFn: async ({ pageParam }) => {
      const page = pageParam ?? 1;
      const data = await apiClient.get<FeedbackItem[]>(
        `/feedback?page=${page}&limit=${FEEDBACK_PAGE_SIZE}`,
      );
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < FEEDBACK_PAGE_SIZE) return undefined;
      return allPages.length + 1;
    },
    // Админка — не нуждается в aggressive refetch
    staleTime: 30_000,
  });
}
