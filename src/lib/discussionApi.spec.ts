import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

vi.mock("@/lib/authApi", () => ({
  getAuthHeader: vi.fn(() => ({ Authorization: "Bearer test-token" })),
  refreshAccessToken: vi.fn(),
  handleUnauthorized: vi.fn(),
}))

vi.mock("@/lib/config", () => ({
  API_BASE_URL: "http://localhost:8080/api",
}))

vi.mock("@/hooks/useAchievementNotifications", () => ({
  triggerAchievementNotification: vi.fn(),
}))

import {
  getDiscussionByBattle,
  getGeneralDiscussion,
  getDiscussionById,
  getTopics,
  createTopic,
  pinTopic,
  deleteTopic,
  createDiscussion,
  createMessage,
  updateMessage,
  deleteMessage,
} from "./discussionApi"

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    statusText: status === 401 ? "Unauthorized" : "OK",
  }
}

const mockTopic: any = {
  id: "t-1",
  title: "Test Topic",
  type: "topic",
  pinned: false,
  createdAt: new Date().toISOString(),
  _count: { messages: 0 },
}

const mockDiscussion: any = {
  id: "d-1",
  title: "Test",
  type: "battle",
  battleId: "b-1",
  messages: [],
  createdAt: new Date().toISOString(),
}

const mockMessage: any = {
  id: "msg-1",
  content: "Hello",
  userId: 1,
  discussionId: "d-1",
  parentId: null,
  createdAt: new Date().toISOString(),
  user: { id: 1, username: "user", avatarUrl: null },
}

describe("discussionApi", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getDiscussionByBattle", () => {
    it("должен запросить GET /discussions/battle/:battleId", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: mockDiscussion }))

      const result = await getDiscussionByBattle("b-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/battle/b-1",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result).toEqual(mockDiscussion)
    })

    it("должен выбросить ошибку при неудаче", async () => {
      mockFetch.mockResolvedValue(mockResponse({ error: { message: "Not found" } }, 404))

      await expect(getDiscussionByBattle("unknown")).rejects.toThrow("Not found")
    })
  })

  describe("getGeneralDiscussion", () => {
    it("должен запросить GET /discussions/general", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: { ...mockDiscussion, type: "general" } }))

      const result = await getGeneralDiscussion()

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/general",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result.type).toBe("general")
    })
  })

  describe("getDiscussionById", () => {
    it("должен запросить GET /discussions/:id", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: mockDiscussion }))

      const result = await getDiscussionById("d-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/d-1",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result).toEqual(mockDiscussion)
    })
  })

  describe("getTopics", () => {
    it("должен запросить GET /discussions/topics", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [mockTopic] }))

      const result = await getTopics()

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/topics",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result).toEqual([mockTopic])
    })

    it("должен вернуть пустой массив", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [] }))

      const result = await getTopics()

      expect(result).toEqual([])
    })
  })

  describe("createTopic", () => {
    it("должен запросить POST /discussions/topics", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: mockTopic }, 201))

      const result = await createTopic("New Topic")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/topics",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ title: "New Topic" }),
        }),
      )
      expect(result).toEqual(mockTopic)
    })
  })

  describe("pinTopic", () => {
    it("должен запросить PATCH /discussions/topics/:id/pin", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: { ...mockTopic, pinned: true } }))

      const result = await pinTopic("t-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/topics/t-1/pin",
        expect.objectContaining({ method: "PATCH" }),
      )
      expect(result.pinned).toBe(true)
    })
  })

  describe("deleteTopic", () => {
    it("должен запросить DELETE /discussions/topics/:id", async () => {
      mockFetch.mockResolvedValue(mockResponse(null, 204))

      await deleteTopic("t-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/topics/t-1",
        expect.objectContaining({ method: "DELETE" }),
      )
    })
  })

  describe("createDiscussion", () => {
    it("должен запросить POST /discussions", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: mockDiscussion }, 201))

      const result = await createDiscussion("b-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ battleId: "b-1", title: undefined }),
        }),
      )
      expect(result).toEqual(mockDiscussion)
    })

    it("должен передать заголовок", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: mockDiscussion }, 201))

      await createDiscussion("b-1", "Comments")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions",
        expect.objectContaining({
          body: JSON.stringify({ battleId: "b-1", title: "Comments" }),
        }),
      )
    })
  })

  describe("createMessage", () => {
    it("должен запросить POST /discussions/:id/messages", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: mockMessage }, 201))

      const result = await createMessage("d-1", "Hello")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/d-1/messages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ content: "Hello", parentId: undefined }),
        }),
      )
      expect(result).toEqual(mockMessage)
    })

    it("должен передать parentId", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: mockMessage }, 201))

      await createMessage("d-1", "Reply", "parent-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/d-1/messages",
        expect.objectContaining({
          body: JSON.stringify({ content: "Reply", parentId: "parent-1" }),
        }),
      )
    })
  })

  describe("updateMessage", () => {
    it("должен запросить PATCH /discussions/:id/messages/:messageId", async () => {
      const updated = { ...mockMessage, content: "Edited" }
      mockFetch.mockResolvedValue(mockResponse({ data: updated }))

      const result = await updateMessage("d-1", "msg-1", "Edited")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/d-1/messages/msg-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ content: "Edited" }),
        }),
      )
      expect(result.content).toBe("Edited")
    })
  })

  describe("deleteMessage", () => {
    it("должен запросить DELETE /discussions/:id/messages/:messageId", async () => {
      mockFetch.mockResolvedValue(mockResponse(null, 204))

      await deleteMessage("d-1", "msg-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/discussions/d-1/messages/msg-1",
        expect.objectContaining({ method: "DELETE" }),
      )
    })
  })
})
