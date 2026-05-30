import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    discussion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    discussionMessage: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  return { prisma: tx }
})

import { prisma } from "../../lib/prisma.js"
import {
  getDiscussionById,
  getDiscussionByBattle,
  getOrCreateGeneralDiscussion,
  createDiscussion,
  getTopics,
  createTopic,
  pinTopic,
  deleteTopic,
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
} from "./discussions.service.js"

const mockMessage = {
  id: "msg-1",
  content: "Hello",
  userId: 1,
  discussionId: "d-1",
  parentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 1, username: "user", avatarUrl: null, role: { name: "user" } },
  parent: null,
}

describe("discussions.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("getDiscussionById", () => {
    it("должен вернуть обсуждение с сообщениями", async () => {
      const mock = { id: "d-1", title: "Test", messages: [mockMessage] }
      vi.mocked(prisma.discussion.findUnique).mockResolvedValue(mock as any)

      const result = await getDiscussionById("d-1")

      expect(result).toEqual(mock)
      expect(prisma.discussion.findUnique).toHaveBeenCalledWith({
        where: { id: "d-1" },
        include: expect.objectContaining({
          messages: expect.objectContaining({ orderBy: { createdAt: "asc" } }),
        }),
      })
    })

    it("должен вернуть null если обсуждение не найдено", async () => {
      vi.mocked(prisma.discussion.findUnique).mockResolvedValue(null)

      const result = await getDiscussionById("not-found")

      expect(result).toBeNull()
    })
  })

  describe("getDiscussionByBattle", () => {
    it("должен найти обсуждение по battleId с типом battle", async () => {
      const mock = { id: "d-1", battleId: "b-1", messages: [] }
      vi.mocked(prisma.discussion.findFirst).mockResolvedValue(mock as any)

      const result = await getDiscussionByBattle("b-1")

      expect(result).toEqual(mock)
      expect(prisma.discussion.findFirst).toHaveBeenCalledWith({
        where: { battleId: "b-1", type: "battle" },
        include: expect.any(Object),
      })
    })

    it("должен вернуть null если нет обсуждения для битвы", async () => {
      vi.mocked(prisma.discussion.findFirst).mockResolvedValue(null)

      const result = await getDiscussionByBattle("unknown")

      expect(result).toBeNull()
    })
  })

  describe("getOrCreateGeneralDiscussion", () => {
    it("должен создать общий чат при первом вызове", async () => {
      vi.mocked(prisma.discussion.findFirst).mockResolvedValue(null)
      const created = { id: "d-1", title: "Общий чат", type: "general", messages: [] }
      vi.mocked(prisma.discussion.create).mockResolvedValue(created as any)

      const result = await getOrCreateGeneralDiscussion()

      expect(result).toEqual(created)
      expect(prisma.discussion.create).toHaveBeenCalledWith({
        data: { title: "Общий чат", type: "general" },
        include: expect.any(Object),
      })
    })

    it("должен вернуть существующий общий чат", async () => {
      const existing = { id: "d-1", title: "Общий чат", type: "general", messages: [] }
      vi.mocked(prisma.discussion.findFirst).mockResolvedValue(existing as any)

      const result = await getOrCreateGeneralDiscussion()

      expect(result).toEqual(existing)
      expect(prisma.discussion.create).not.toHaveBeenCalled()
    })
  })

  describe("createDiscussion", () => {
    it("должен создать обсуждение для битвы", async () => {
      const created = { id: "d-1", battleId: "b-1", type: "battle" }
      vi.mocked(prisma.discussion.create).mockResolvedValue(created as any)

      const result = await createDiscussion("b-1")

      expect(result).toEqual(created)
      expect(prisma.discussion.create).toHaveBeenCalledWith({
        data: { battleId: "b-1", title: null, type: "battle" },
      })
    })

    it("должен создать обсуждение с заголовком", async () => {
      const created = { id: "d-1", battleId: "b-1", title: "Comments", type: "battle" }
      vi.mocked(prisma.discussion.create).mockResolvedValue(created as any)

      const result = await createDiscussion("b-1", "Comments")

      expect(result).toEqual(created)
      expect(prisma.discussion.create).toHaveBeenCalledWith({
        data: { battleId: "b-1", title: "Comments", type: "battle" },
      })
    })
  })

  describe("getTopics", () => {
    it("должен вернуть список топиков с сортировкой", async () => {
      const topics = [
        { id: "t-1", title: "Pinned", pinned: true, pinnedAt: new Date(), _count: { messages: 5 } },
        { id: "t-2", title: "Recent", pinned: false, _count: { messages: 2 } },
      ]
      vi.mocked(prisma.discussion.findMany).mockResolvedValue(topics as any)

      const result = await getTopics()

      expect(result).toEqual(topics)
      expect(prisma.discussion.findMany).toHaveBeenCalledWith({
        where: { type: "topic" },
        include: expect.objectContaining({
          _count: { select: { messages: true } },
        }),
        orderBy: [
          { pinned: "desc" },
          { pinnedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
      })
    })

    it("должен вернуть пустой массив если топиков нет", async () => {
      vi.mocked(prisma.discussion.findMany).mockResolvedValue([])

      const result = await getTopics()

      expect(result).toEqual([])
    })
  })

  describe("createTopic", () => {
    it("должен создать топик с автором", async () => {
      const topic = { id: "t-1", title: "New Topic", type: "topic", authorId: 1 }
      vi.mocked(prisma.discussion.create).mockResolvedValue(topic as any)

      const result = await createTopic("New Topic", 1)

      expect(result).toEqual(topic)
      expect(prisma.discussion.create).toHaveBeenCalledWith({
        data: { title: "New Topic", type: "topic", authorId: 1 },
        include: expect.objectContaining({
          author: { select: { id: true, username: true, avatarUrl: true, isDonor: true } },
        }),
      })
    })
  })

  describe("pinTopic", () => {
    it("должен закрепить существующий топик", async () => {
      const existing = { id: "t-1", pinned: false }
      const updated = { id: "t-1", pinned: true, pinnedAt: new Date(), _count: { messages: 0 } }
      vi.mocked(prisma.discussion.findUnique).mockResolvedValue(existing as any)
      vi.mocked(prisma.discussion.update).mockResolvedValue(updated as any)

      const result = await pinTopic("t-1")

      expect(result).toEqual(updated)
      expect(prisma.discussion.update).toHaveBeenCalledWith({
        where: { id: "t-1" },
        data: { pinned: true, pinnedAt: expect.any(Date) },
        include: expect.any(Object),
      })
    })

    it("должен открепить закреплённый топик", async () => {
      const existing = { id: "t-1", pinned: true, pinnedAt: new Date() }
      const updated = { id: "t-1", pinned: false, pinnedAt: null, _count: { messages: 0 } }
      vi.mocked(prisma.discussion.findUnique).mockResolvedValue(existing as any)
      vi.mocked(prisma.discussion.update).mockResolvedValue(updated as any)

      const result = await pinTopic("t-1")

      expect(result).toEqual(updated)
      expect(prisma.discussion.update).toHaveBeenCalledWith({
        where: { id: "t-1" },
        data: { pinned: false, pinnedAt: null },
        include: expect.any(Object),
      })
    })

    it("должен выбросить ошибку если топик не найден", async () => {
      vi.mocked(prisma.discussion.findUnique).mockResolvedValue(null)

      await expect(pinTopic("not-found")).rejects.toThrow("Topic not found")
    })
  })

  describe("deleteTopic", () => {
    it("должен удалить существующий топик", async () => {
      vi.mocked(prisma.discussion.findUnique).mockResolvedValue({ id: "t-1" } as any)

      await deleteTopic("t-1")

      expect(prisma.discussion.delete).toHaveBeenCalledWith({ where: { id: "t-1" } })
    })

    it("должен выбросить ошибку если топик не найден", async () => {
      vi.mocked(prisma.discussion.findUnique).mockResolvedValue(null)

      await expect(deleteTopic("not-found")).rejects.toThrow("Topic not found")
      expect(prisma.discussion.delete).not.toHaveBeenCalled()
    })
  })

  describe("getMessages", () => {
    it("должен вернуть пагинированные сообщения", async () => {
      const messages = [mockMessage, { ...mockMessage, id: "msg-2" }]
      vi.mocked(prisma.discussionMessage.findMany).mockResolvedValue(messages as any)
      vi.mocked(prisma.discussionMessage.count).mockResolvedValue(10)

      const result = await getMessages("d-1", 1, 20)

      expect(result).toEqual({ messages, total: 10 })
      expect(prisma.discussionMessage.findMany).toHaveBeenCalledWith({
        where: { discussionId: "d-1" },
        include: expect.any(Object),
        orderBy: { createdAt: "asc" },
        skip: 0,
        take: 20,
      })
    })

    it("должен корректно вычислять skip для второй страницы", async () => {
      vi.mocked(prisma.discussionMessage.findMany).mockResolvedValue([])
      vi.mocked(prisma.discussionMessage.count).mockResolvedValue(25)

      await getMessages("d-1", 2, 10)

      expect(prisma.discussionMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      )
    })
  })

  describe("createMessage", () => {
    it("должен создать сообщение и обновить lastMessageAt", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (ops: any[]) => {
        return Promise.all(ops)
      })
      vi.mocked(prisma.discussionMessage.create).mockResolvedValue(mockMessage as any)

      const result = await createMessage("d-1", 1, "Hello")

      expect(result).toEqual(mockMessage)
      expect(prisma.$transaction).toHaveBeenCalledOnce()
      expect(prisma.discussion.update).toHaveBeenCalledWith({
        where: { id: "d-1" },
        data: { lastMessageAt: expect.any(Date) },
      })
    })

    it("должен проверить parentId если указан", async () => {
      vi.mocked(prisma.discussionMessage.findUnique).mockResolvedValue({
        id: "parent-1",
        discussionId: "d-1",
      } as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (ops: any[]) => {
        return Promise.all(ops)
      })
      vi.mocked(prisma.discussionMessage.create).mockResolvedValue({
        ...mockMessage,
        parentId: "parent-1",
      } as any)

      const result = await createMessage("d-1", 1, "Reply", "parent-1")

      expect(result.parentId).toBe("parent-1")
      expect(prisma.discussionMessage.findUnique).toHaveBeenCalledWith({
        where: { id: "parent-1" },
        select: { discussionId: true },
      })
    })

    it("должен выбросить ошибку если parentId невалидный", async () => {
      vi.mocked(prisma.discussionMessage.findUnique).mockResolvedValue(null)

      await expect(createMessage("d-1", 1, "Reply", "bad-parent")).rejects.toThrow(
        "Parent message not found",
      )
    })

    it("должен выбросить ошибку если parent в другом обсуждении", async () => {
      vi.mocked(prisma.discussionMessage.findUnique).mockResolvedValue({
        id: "parent-1",
        discussionId: "other-discussion",
      } as any)

      await expect(createMessage("d-1", 1, "Reply", "parent-1")).rejects.toThrow(
        "Parent message not found",
      )
    })
  })

  describe("updateMessage", () => {
    it("должен обновить своё сообщение", async () => {
      vi.mocked(prisma.discussionMessage.findUnique).mockResolvedValue({
        id: "msg-1",
        userId: 1,
      } as any)
      const updated = { ...mockMessage, content: "Edited" }
      vi.mocked(prisma.discussionMessage.update).mockResolvedValue(updated as any)

      const result = await updateMessage("msg-1", 1, "Edited")

      expect(result.content).toBe("Edited")
      expect(prisma.discussionMessage.update).toHaveBeenCalledWith({
        where: { id: "msg-1" },
        data: { content: "Edited" },
        include: expect.any(Object),
      })
    })

    it("должен выбросить ошибку при попытке редактировать чужое", async () => {
      vi.mocked(prisma.discussionMessage.findUnique).mockResolvedValue({
        id: "msg-1",
        userId: 2,
      } as any)

      await expect(updateMessage("msg-1", 1, "Edited")).rejects.toThrow(
        "You can only edit your own messages",
      )
    })

    it("должен выбросить ошибку если сообщение не найдено", async () => {
      vi.mocked(prisma.discussionMessage.findUnique).mockResolvedValue(null)

      await expect(updateMessage("not-found", 1, "Edited")).rejects.toThrow("Message not found")
    })
  })

  describe("deleteMessage", () => {
    it("должен удалить сообщение админом", async () => {
      vi.mocked(prisma.discussionMessage.findUnique).mockResolvedValue({
        id: "msg-1",
      } as any)

      await deleteMessage("msg-1", 1, "admin")

      expect(prisma.discussionMessage.delete).toHaveBeenCalledWith({ where: { id: "msg-1" } })
    })

    it("должен удалить сообщение модератором", async () => {
      vi.mocked(prisma.discussionMessage.findUnique).mockResolvedValue({
        id: "msg-1",
      } as any)

      await deleteMessage("msg-1", 1, "moderator")

      expect(prisma.discussionMessage.delete).toHaveBeenCalledWith({ where: { id: "msg-1" } })
    })

    it("должен выбросить ошибку для пользователя без прав", async () => {
      vi.mocked(prisma.discussionMessage.findUnique).mockResolvedValue({
        id: "msg-1",
      } as any)

      await expect(deleteMessage("msg-1", 1, "user")).rejects.toThrow(
        "Only admins and moderators can delete messages",
      )
    })

    it("должен выбросить ошибку если сообщение не найдено", async () => {
      vi.mocked(prisma.discussionMessage.findUnique).mockResolvedValue(null)

      await expect(deleteMessage("not-found", 1, "admin")).rejects.toThrow("Message not found")
    })
  })
})
