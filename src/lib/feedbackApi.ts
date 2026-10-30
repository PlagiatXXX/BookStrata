import { apiClient } from "./api-client";

export interface FeedbackInput {
  type: "bug" | "feature" | "other";
  message: string;
  pageUrl?: string;
  userEmail?: string;
}

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

export async function sendFeedback(input: FeedbackInput) {
  return apiClient.post("/feedback", input);
}

export async function getFeedbackList(page = 1, limit = 50): Promise<FeedbackItem[]> {
  return apiClient.get<FeedbackItem[]>(`/feedback?page=${page}&limit=${limit}`);
}

export async function updateFeedbackStatus(id: number, status: string): Promise<FeedbackItem> {
  return apiClient.patch<FeedbackItem>(`/feedback/${id}`, { status });
}

export async function deleteFeedback(id: number): Promise<void> {
  return apiClient.delete(`/feedback/${id}`);
}
