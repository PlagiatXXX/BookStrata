import { apiClient } from "./api-client";
import type { SupportThreadDto, SupportMessageDto } from "../../shared/types";

export const GUEST_TOKEN_KEY = "bookstrata_guest_token";

export function getOrCreateGuestToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let token = localStorage.getItem(GUEST_TOKEN_KEY);
    if (!token) {
      token = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(GUEST_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return "";
  }
}

export function apiGetSupportThread(guestToken?: string): Promise<SupportThreadDto | null> {
  const token = guestToken || getOrCreateGuestToken();
  return apiClient.get<SupportThreadDto | null>("/support/thread", { guestToken: token });
}

export function apiSendSupportMessage(input: {
  text: string;
  replyToId?: number;
  guestToken?: string;
}): Promise<{ message: SupportMessageDto; thread: SupportThreadDto }> {
  const token = input.guestToken || getOrCreateGuestToken();
  return apiClient.post<{ message: SupportMessageDto; thread: SupportThreadDto }>("/support/message", {
    text: input.text,
    replyToId: input.replyToId,
    guestToken: token,
  });
}

export function apiMarkSupportThreadRead(
  threadId: number,
  guestToken?: string
): Promise<{ success: boolean }> {
  const token = guestToken || getOrCreateGuestToken();
  return apiClient.post<{ success: boolean }>("/support/read", {
    threadId,
    guestToken: token,
  });
}

export function apiAdminGetSupportThreads(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ threads: SupportThreadDto[]; total: number; page: number; limit: number }> {
  return apiClient.get("/admin/support/threads", params);
}

export function apiAdminGetThreadMessages(
  threadId: number
): Promise<{ thread: SupportThreadDto; messages: SupportMessageDto[] }> {
  return apiClient.get(`/admin/support/threads/${threadId}/messages`);
}

export function apiAdminReplySupportThread(
  threadId: number,
  input: { text: string; replyToId?: number }
): Promise<{ message: SupportMessageDto; thread: SupportThreadDto }> {
  return apiClient.post(`/admin/support/threads/${threadId}/reply`, input);
}

export function apiAdminDeleteSupportMessage(messageId: number): Promise<void> {
  return apiClient.delete(`/admin/support/messages/${messageId}`);
}

export function apiAdminDeleteSupportThread(threadId: number): Promise<void> {
  return apiClient.delete(`/admin/support/threads/${threadId}`);
}

export function apiAdminUpdateSupportThreadStatus(
  threadId: number,
  status: string
): Promise<SupportThreadDto> {
  return apiClient.patch(`/admin/support/threads/${threadId}/status`, { status });
}
