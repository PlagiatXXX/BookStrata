import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  apiGetSupportThread,
  apiSendSupportMessage,
  apiMarkSupportThreadRead,
  apiAdminGetSupportThreads,
  apiAdminGetThreadMessages,
  apiAdminReplySupportThread,
  apiAdminDeleteSupportMessage,
  apiAdminDeleteSupportThread,
  apiAdminUpdateSupportThreadStatus,
  apiAdminGetOrCreateUserThread,
  apiAdminSearchSupportUsers,
  getOrCreateGuestToken,
  GUEST_TOKEN_KEY,
} from "./supportApi";
import { apiClient } from "./api-client";

vi.mock("./api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("supportApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("getOrCreateGuestToken", () => {
    it("generates and stores token in localStorage", () => {
      const token = getOrCreateGuestToken();
      expect(token).toBeTruthy();
      expect(localStorage.getItem(GUEST_TOKEN_KEY)).toBe(token);

      // Subsequent call returns the same token
      expect(getOrCreateGuestToken()).toBe(token);
    });
  });

  describe("user endpoints", () => {
    it("apiGetSupportThread calls /support/thread with guestToken", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ id: 1 } as any);
      const res = await apiGetSupportThread("test-guest");
      expect(apiClient.get).toHaveBeenCalledWith("/support/thread", { guestToken: "test-guest" });
      expect(res).toEqual({ id: 1 });
    });

    it("apiSendSupportMessage calls /support/message", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ message: { id: 10 } } as any);
      await apiSendSupportMessage({ text: "Hello", replyToId: 5, guestToken: "test-guest" });
      expect(apiClient.post).toHaveBeenCalledWith("/support/message", {
        text: "Hello",
        replyToId: 5,
        guestToken: "test-guest",
      });
    });

    it("apiMarkSupportThreadRead calls /support/read", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ success: true } as any);
      await apiMarkSupportThreadRead(12, "test-guest");
      expect(apiClient.post).toHaveBeenCalledWith("/support/read", {
        threadId: 12,
        guestToken: "test-guest",
      });
    });
  });

  describe("admin endpoints", () => {
    it("apiAdminGetSupportThreads calls /admin/support/threads", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ threads: [] } as any);
      await apiAdminGetSupportThreads({ status: "open", page: 1, limit: 10 });
      expect(apiClient.get).toHaveBeenCalledWith("/admin/support/threads", {
        status: "open",
        page: 1,
        limit: 10,
      });
    });

    it("apiAdminGetThreadMessages calls /admin/support/threads/:id/messages", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ thread: { id: 7 }, messages: [] } as any);
      await apiAdminGetThreadMessages(7);
      expect(apiClient.get).toHaveBeenCalledWith("/admin/support/threads/7/messages");
    });

    it("apiAdminReplySupportThread calls /admin/support/threads/:id/reply", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ message: { id: 99 } } as any);
      await apiAdminReplySupportThread(7, { text: "Reply text", replyToId: 12 });
      expect(apiClient.post).toHaveBeenCalledWith("/admin/support/threads/7/reply", {
        text: "Reply text",
        replyToId: 12,
      });
    });

    it("apiAdminDeleteSupportMessage calls /admin/support/messages/:id", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(null as any);
      await apiAdminDeleteSupportMessage(44);
      expect(apiClient.delete).toHaveBeenCalledWith("/admin/support/messages/44");
    });

    it("apiAdminDeleteSupportThread calls /admin/support/threads/:id", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(null as any);
      await apiAdminDeleteSupportThread(7);
      expect(apiClient.delete).toHaveBeenCalledWith("/admin/support/threads/7");
    });

    it("apiAdminUpdateSupportThreadStatus calls /admin/support/threads/:id/status", async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ id: 7, status: "resolved" } as any);
      await apiAdminUpdateSupportThreadStatus(7, "resolved");
      expect(apiClient.patch).toHaveBeenCalledWith("/admin/support/threads/7/status", {
        status: "resolved",
      });
    });

    it("apiAdminGetOrCreateUserThread calls POST /admin/support/threads/get-or-create with userId", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ threadId: 42, isNew: true } as any);
      const res = await apiAdminGetOrCreateUserThread(10);
      expect(apiClient.post).toHaveBeenCalledWith("/admin/support/threads/get-or-create", { userId: 10 });
      expect(res).toEqual({ threadId: 42, isNew: true });
    });

    it("apiAdminSearchSupportUsers calls GET /admin/support/users/search with query param", async () => {
      vi.mocked(apiClient.get).mockResolvedValue([{ id: 10, username: "user1" }] as any);
      const res = await apiAdminSearchSupportUsers("user");
      expect(apiClient.get).toHaveBeenCalledWith("/admin/support/users/search", { q: "user" });
      expect(res).toEqual([{ id: 10, username: "user1" }]);
    });
  });
});
