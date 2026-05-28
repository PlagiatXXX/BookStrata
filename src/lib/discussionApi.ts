import { apiClient } from "./api-client"
import type { Discussion, DiscussionMessage } from "@/types/discussions"

export async function getDiscussionByBattle(battleId: string): Promise<Discussion> {
  return apiClient.get(`/discussions/battle/${battleId}`)
}

export async function getGeneralDiscussion(): Promise<Discussion> {
  return apiClient.get("/discussions/general")
}

export async function createDiscussion(battleId: string, title?: string): Promise<Discussion> {
  return apiClient.post("/discussions", { battleId, title })
}

export async function createMessage(
  discussionId: string,
  content: string,
  parentId?: string,
): Promise<DiscussionMessage> {
  return apiClient.post(`/discussions/${discussionId}/messages`, { content, parentId })
}

export async function updateMessage(
  discussionId: string,
  messageId: string,
  content: string,
): Promise<DiscussionMessage> {
  return apiClient.patch(`/discussions/${discussionId}/messages/${messageId}`, { content })
}

export async function deleteMessage(
  discussionId: string,
  messageId: string,
): Promise<void> {
  return apiClient.delete(`/discussions/${discussionId}/messages/${messageId}`)
}
