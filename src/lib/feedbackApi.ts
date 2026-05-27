import { apiClient } from "./api-client";

export interface FeedbackInput {
  type: "bug" | "feature" | "other";
  message: string;
  pageUrl?: string;
  userEmail?: string;
}

export async function sendFeedback(input: FeedbackInput) {
  return apiClient.post("/feedback", input);
}
