import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    supportThread: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    supportMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { prisma: tx };
});

import {
  getOrCreateThread,
  sendUserMessage,
  markThreadReadByUser,
  getAdminThreads,
  sendAdminReply,
  deleteMessage,
  deleteThread,
} from "./support.service.js";
import { prisma } from "../../lib/prisma.js";

describe("support.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getOrCreateThread", () => {
    it("returns existing thread for registered user", async () => {
      vi.mocked(prisma.supportThread.findFirst).mockResolvedValue({
        id: 1,
        userId: 10,
      } as any);

      const thread = await getOrCreateThread({ userId: 10 });
      expect(thread).toEqual({ id: 1, userId: 10 });
      expect(prisma.supportThread.create).not.toHaveBeenCalled();
    });

    it("creates new thread for guest when not found", async () => {
      vi.mocked(prisma.supportThread.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.supportThread.create).mockResolvedValue({
        id: 2,
        guestToken: "uuid-123",
      } as any);

      const thread = await getOrCreateThread({ guestToken: "uuid-123" });
      expect(thread).toEqual({ id: 2, guestToken: "uuid-123" });
      expect(prisma.supportThread.create).toHaveBeenCalledWith({
        data: { guestToken: "uuid-123" },
      });
    });

    it("throws if neither userId nor guestToken provided", async () => {
      await expect(getOrCreateThread({})).rejects.toThrow();
    });
  });

  describe("sendUserMessage", () => {
    it("creates message, updates thread status and increments unreadByAdmin", async () => {
      vi.mocked(prisma.supportThread.findFirst).mockResolvedValue({
        id: 5,
        userId: 20,
      } as any);
      vi.mocked(prisma.supportMessage.create).mockResolvedValue({
        id: 100,
        threadId: 5,
        senderRole: "user",
        text: "Привет!",
        replyToId: 99,
      } as any);
      vi.mocked(prisma.supportThread.update).mockResolvedValue({
        id: 5,
        status: "open",
        unreadByAdmin: 1,
      } as any);

      const res = await sendUserMessage({
        userId: 20,
        text: "Привет!",
        replyToId: 99,
      });

      expect(res.message.id).toBe(100);
      expect(prisma.supportMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            threadId: 5,
            senderRole: "user",
            text: "Привет!",
            replyToId: 99,
          }),
        })
      );
      expect(prisma.supportThread.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({
            status: "open",
            unreadByAdmin: { increment: 1 },
          }),
        })
      );
    });
  });

  describe("sendAdminReply", () => {
    it("creates admin message, marks answered and increments unreadByUser", async () => {
      vi.mocked(prisma.supportMessage.create).mockResolvedValue({
        id: 101,
        threadId: 5,
        senderRole: "admin",
        text: "Ответ поддержки",
      } as any);
      vi.mocked(prisma.supportThread.update).mockResolvedValue({
        id: 5,
        status: "answered",
        unreadByUser: 1,
      } as any);

      const res = await sendAdminReply({
        threadId: 5,
        adminId: 1,
        text: "Ответ поддержки",
      });

      expect(res.message.id).toBe(101);
      expect(prisma.supportThread.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({
            status: "answered",
            unreadByUser: { increment: 1 },
            unreadByAdmin: 0,
          }),
        })
      );
    });
  });

  describe("deleteMessage & deleteThread", () => {
    it("deletes single message", async () => {
      vi.mocked(prisma.supportMessage.delete).mockResolvedValue({ id: 50 } as any);
      await deleteMessage(50);
      expect(prisma.supportMessage.delete).toHaveBeenCalledWith({ where: { id: 50 } });
    });

    it("deletes entire thread (chat clearing)", async () => {
      vi.mocked(prisma.supportThread.delete).mockResolvedValue({ id: 10 } as any);
      await deleteThread(10);
      expect(prisma.supportThread.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    });
  });

  describe("markThreadReadByUser", () => {
    it("returns null if neither userId nor guestToken provided", async () => {
      const res = await markThreadReadByUser({ threadId: 10 });
      expect(res).toBeNull();
      expect(prisma.supportThread.findFirst).not.toHaveBeenCalled();
    });

    it("resets unreadByUser to 0 when thread matches user", async () => {
      vi.mocked(prisma.supportThread.findFirst).mockResolvedValue({ id: 10, userId: 5 } as any);
      vi.mocked(prisma.supportThread.update).mockResolvedValue({ id: 10, unreadByUser: 0 } as any);

      const res = await markThreadReadByUser({ threadId: 10, userId: 5 });
      expect(res).toEqual({ id: 10, unreadByUser: 0 });
      expect(prisma.supportThread.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { unreadByUser: 0 },
      });
    });
  });

  describe("getAdminThreads", () => {
    it("returns paginated threads with count", async () => {
      vi.mocked(prisma.supportThread.findMany).mockResolvedValue([
        { id: 1, status: "open" },
      ] as any);
      vi.mocked(prisma.supportThread.count).mockResolvedValue(1);

      const result = await getAdminThreads({ status: "open", page: 1, limit: 10 });
      expect(result.threads).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
