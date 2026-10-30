import { getFeedbackList, type FeedbackItem } from "@/lib/feedbackApi";
import { useInfiniteQuery } from "@tanstack/react-query";

export type { FeedbackItem };

const FEEDBACK_PAGE_SIZE = 50;

export function useFeedback() {
  return useInfiniteQuery<FeedbackItem[]>({
    queryKey: ["feedback"],
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" ? pageParam : 1;
      return getFeedbackList(page, FEEDBACK_PAGE_SIZE);
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
