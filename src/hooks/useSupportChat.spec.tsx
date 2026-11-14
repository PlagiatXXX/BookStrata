import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useSupportChat, calculateSupportRefetchInterval } from "./useSupportChat";
import * as supportApi from "@/lib/supportApi";
import * as analyticsApi from "@/lib/analyticsApi";

vi.mock("@/lib/supportApi", () => ({
  apiGetSupportThread: vi.fn(),
  apiSendSupportMessage: vi.fn(),
  apiMarkSupportThreadRead: vi.fn(),
}));

vi.mock("@/lib/analyticsApi", () => ({
  apiTrackEvent: vi.fn(),
}));

describe("useSupportChat", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it("loads thread and returns unreadCount", async () => {
    vi.mocked(supportApi.apiGetSupportThread).mockResolvedValue({
      id: 1,
      userId: 5,
      guestToken: null,
      status: "open",
      unreadByUser: 2,
      unreadByAdmin: 0,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [{ id: 10, text: "Привет", threadId: 1, senderRole: "user", senderId: 5, replyToId: null, createdAt: new Date().toISOString() }],
    });

    const { result } = renderHook(() => useSupportChat(), { wrapper });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2);
      expect(result.current.messages).toHaveLength(1);
    });
  });

  it("sends message and tracks event", async () => {
    vi.mocked(supportApi.apiGetSupportThread).mockResolvedValue(null);
    vi.mocked(supportApi.apiSendSupportMessage).mockResolvedValue({
      message: {
        id: 11,
        text: "Вопрос",
        threadId: 1,
        senderRole: "user",
        senderId: 5,
        replyToId: 10,
        createdAt: new Date().toISOString(),
      },
      thread: {
        id: 1,
        userId: 5,
        guestToken: null,
        status: "open",
        unreadByUser: 0,
        unreadByAdmin: 1,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    const { result } = renderHook(() => useSupportChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Вопрос", 10);
    });

    expect(supportApi.apiSendSupportMessage).toHaveBeenCalledWith({
      text: "Вопрос",
      replyToId: 10,
    });
    expect(analyticsApi.apiTrackEvent).toHaveBeenCalledWith(
      "support.message_sent",
      expect.objectContaining({ hasReply: true })
    );
  });

  describe("calculateSupportRefetchInterval", () => {
    it("returns false on query error", () => {
      expect(
        calculateSupportRefetchInterval({
          isOpen: true,
          queryError: true,
        })
      ).toBe(false);
    });

    it("returns 4000 when chat is open regardless of status", () => {
      expect(
        calculateSupportRefetchInterval({
          isOpen: true,
          threadStatus: "open",
        })
      ).toBe(4000);

      expect(
        calculateSupportRefetchInterval({
          isOpen: true,
          threadStatus: "answered",
        })
      ).toBe(4000);
    });

    it("returns 8000 when chat is closed but thread is in open status (waiting for admin)", () => {
      expect(
        calculateSupportRefetchInterval({
          isOpen: false,
          threadStatus: "open",
        })
      ).toBe(8000);
    });

    it("returns 60000 when chat is closed and not waiting for answer", () => {
      expect(
        calculateSupportRefetchInterval({
          isOpen: false,
          threadStatus: "answered",
        })
      ).toBe(60000);

      expect(
        calculateSupportRefetchInterval({
          isOpen: false,
          threadStatus: undefined,
        })
      ).toBe(60000);
    });
  });
});
