import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import Fastify from "fastify"

vi.mock("./discussions.service.js", () => ({
  getTopics: vi.fn(),
  createTopic: vi.fn(),
  pinTopic: vi.fn(),
  deleteTopic: vi.fn(),
  getDiscussionByBattle: vi.fn(),
  getDiscussionById: vi.fn(),
  getOrCreateGeneralDiscussion: vi.fn(),
  createDiscussion: vi.fn(),
  getMessages: vi.fn(),
  createMessage: vi.fn(),
  updateMessage: vi.fn(),
  deleteMessage: vi.fn(),
}))

import * as mockService from "./discussions.service.js"

const mockTopic: any = {
  id: "t-1",
  title: "Test Topic",
  type: "topic",
  pinned: false,
  pinnedAt: null,
  author: { id: 1, username: "user", avatarUrl: null },
  _count: { messages: 0 },
  createdAt: new Date().toISOString(),
  lastMessageAt: null,
}

const mockDiscussion: any = {
  id: "d-1",
  title: "Test Discussion",
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
  updatedAt: new Date().toISOString(),
  user: { id: 1, username: "user", avatarUrl: null, role: { name: "user" } },
  parent: null,
}

describe("Discussions Routes", () => {
  let app: ReturnType<typeof Fastify>

  async function createApp() {
    const instance = Fastify({ logger: false })

    instance.decorate("prisma", {
      user: {
        findUnique: vi.fn().mockResolvedValue({ chatBannedAt: null, chatBannedUntil: null }),
      },
    })

    instance.addHook("preHandler", (request: any, _reply: any, done: any) => {
      const auth = request.headers.authorization
      if (auth === "Bearer admin-token") {
        request.user = { userId: 1, username: "admin", role: "admin" }
      } else if (auth === "Bearer user-token") {
        request.user = { userId: 2, username: "user", role: "user" }
      } else if (auth === "Bearer mod-token") {
        request.user = { userId: 3, username: "mod", role: "moderator" }
      }
      done()
    })

    const { discussionRoutes } = await import("./discussions.route.js")
    await instance.register(discussionRoutes, { prefix: "/api/discussions" })
    await instance.ready()
    return instance
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
  })

  describe("GET /api/discussions/topics", () => {
    it("должен вернуть список топиков", async () => {
      vi.mocked(mockService.getTopics).mockResolvedValue([mockTopic])

      const res = await request(app.server).get("/api/discussions/topics").expect(200)

      expect(res.body).toEqual({ data: [mockTopic] })
    })

    it("не требует авторизации", async () => {
      vi.mocked(mockService.getTopics).mockResolvedValue([])

      const res = await request(app.server).get("/api/discussions/topics").expect(200)

      expect(res.body.data).toEqual([])
    })
  })

  describe("POST /api/discussions/topics", () => {
    it("должен создать топик (авторизован)", async () => {
      vi.mocked(mockService.createTopic).mockResolvedValue(mockTopic)

      const res = await request(app.server)
        .post("/api/discussions/topics")
        .set("Authorization", "Bearer user-token")
        .send({ title: "New Topic" })
        .expect(201)

      expect(res.body).toEqual({ data: mockTopic })
      expect(mockService.createTopic).toHaveBeenCalledWith("New Topic", 2)
    })

    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server)
        .post("/api/discussions/topics")
        .send({ title: "New Topic" })
        .expect(401)
    })

    it("должен вернуть 400 если title пустой", async () => {
      const res = await request(app.server)
        .post("/api/discussions/topics")
        .set("Authorization", "Bearer user-token")
        .send({ title: "" })
        .expect(400)

      expect(res.body.error.code).toBe("validation_error")
    })
  })

  describe("PATCH /api/discussions/topics/:id/pin", () => {
    it("должен закрепить топик (админ)", async () => {
      vi.mocked(mockService.pinTopic).mockResolvedValue({
        ...mockTopic,
        pinned: true,
        pinnedAt: new Date().toISOString(),
      })

      const res = await request(app.server)
        .patch("/api/discussions/topics/t-1/pin")
        .set("Authorization", "Bearer admin-token")
        .expect(200)

      expect(res.body.data.pinned).toBe(true)
    })

    it("должен открепить топик (админ)", async () => {
      vi.mocked(mockService.pinTopic).mockResolvedValue({
        ...mockTopic,
        pinned: false,
        pinnedAt: null,
      })

      const res = await request(app.server)
        .patch("/api/discussions/topics/t-1/pin")
        .set("Authorization", "Bearer admin-token")
        .expect(200)

      expect(res.body.data.pinned).toBe(false)
    })

    it("должен вернуть 403 для обычного пользователя", async () => {
      const res = await request(app.server)
        .patch("/api/discussions/topics/t-1/pin")
        .set("Authorization", "Bearer user-token")
        .expect(403)

      expect(res.body.error.code).toBe("forbidden")
    })

    it("должен вернуть 404 если топик не найден", async () => {
      vi.mocked(mockService.pinTopic).mockRejectedValue(new Error("Topic not found"))

      const res = await request(app.server)
        .patch("/api/discussions/topics/not-found/pin")
        .set("Authorization", "Bearer admin-token")
        .expect(404)

      expect(res.body.error.code).toBe("not_found")
    })
  })

  describe("DELETE /api/discussions/topics/:id", () => {
    it("должен удалить топик (админ)", async () => {
      vi.mocked(mockService.deleteTopic).mockResolvedValue(undefined)

      await request(app.server)
        .delete("/api/discussions/topics/t-1")
        .set("Authorization", "Bearer admin-token")
        .expect(204)
    })

    it("должен удалить топик (модератор)", async () => {
      vi.mocked(mockService.deleteTopic).mockResolvedValue(undefined)

      await request(app.server)
        .delete("/api/discussions/topics/t-1")
        .set("Authorization", "Bearer mod-token")
        .expect(204)
    })

    it("должен вернуть 403 для обычного пользователя", async () => {
      const res = await request(app.server)
        .delete("/api/discussions/topics/t-1")
        .set("Authorization", "Bearer user-token")
        .expect(403)

      expect(res.body.error.code).toBe("forbidden")
    })

    it("должен вернуть 404 если топик не найден", async () => {
      vi.mocked(mockService.deleteTopic).mockRejectedValue(new Error("Topic not found"))

      const res = await request(app.server)
        .delete("/api/discussions/topics/not-found")
        .set("Authorization", "Bearer admin-token")
        .expect(404)

      expect(res.body.error.code).toBe("not_found")
    })
  })

  describe("GET /api/discussions/general", () => {
    it("должен вернуть или создать общий чат", async () => {
      vi.mocked(mockService.getOrCreateGeneralDiscussion).mockResolvedValue({
        ...mockDiscussion,
        type: "general",
      })

      const res = await request(app.server)
        .get("/api/discussions/general")
        .set("Authorization", "Bearer user-token")
        .expect(200)

      expect(res.body.data.type).toBe("general")
    })

    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server).get("/api/discussions/general").expect(401)
    })
  })

  describe("GET /api/discussions/battle/:battleId", () => {
    it("должен вернуть обсуждение для битвы", async () => {
      vi.mocked(mockService.getDiscussionByBattle).mockResolvedValue(mockDiscussion)

      const res = await request(app.server)
        .get("/api/discussions/battle/b-1")
        .expect(200)

      expect(res.body.data).toEqual(mockDiscussion)
    })

    it("должен вернуть 404 если обсуждения нет", async () => {
      vi.mocked(mockService.getDiscussionByBattle).mockResolvedValue(null)

      const res = await request(app.server)
        .get("/api/discussions/battle/unknown")
        .expect(404)

      expect(res.body.error.code).toBe("not_found")
    })

    it("не требует авторизации", async () => {
      vi.mocked(mockService.getDiscussionByBattle).mockResolvedValue(mockDiscussion)

      await request(app.server).get("/api/discussions/battle/b-1").expect(200)
    })
  })

  describe("GET /api/discussions/:id", () => {
    it("должен вернуть обсуждение по ID", async () => {
      vi.mocked(mockService.getDiscussionById).mockResolvedValue(mockDiscussion)

      const res = await request(app.server)
        .get("/api/discussions/d-1")
        .expect(200)

      expect(res.body.data.id).toBe("d-1")
    })

    it("должен вернуть 404 если не найдено", async () => {
      vi.mocked(mockService.getDiscussionById).mockResolvedValue(null)

      const res = await request(app.server)
        .get("/api/discussions/not-found")
        .expect(404)

      expect(res.body.error.code).toBe("not_found")
    })

    it("не требует авторизации", async () => {
      vi.mocked(mockService.getDiscussionById).mockResolvedValue(mockDiscussion)

      await request(app.server).get("/api/discussions/d-1").expect(200)
    })
  })

  describe("POST /api/discussions", () => {
    it("должен создать обсуждение с battleId", async () => {
      vi.mocked(mockService.createDiscussion).mockResolvedValue(mockDiscussion)

      const res = await request(app.server)
        .post("/api/discussions")
        .set("Authorization", "Bearer user-token")
        .send({ battleId: "b-1" })
        .expect(201)

      expect(res.body.data).toEqual(mockDiscussion)
    })

    it("должен создать обсуждение с заголовком", async () => {
      vi.mocked(mockService.createDiscussion).mockResolvedValue({
        ...mockDiscussion,
        title: "Comments",
      })

      await request(app.server)
        .post("/api/discussions")
        .set("Authorization", "Bearer user-token")
        .send({ battleId: "b-1", title: "Comments" })
        .expect(201)

      expect(mockService.createDiscussion).toHaveBeenCalledWith("b-1", "Comments")
    })

    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server)
        .post("/api/discussions")
        .send({ battleId: "b-1" })
        .expect(401)
    })
  })

  describe("GET /api/discussions/:id/messages", () => {
    it("должен вернуть пагинированные сообщения", async () => {
      vi.mocked(mockService.getMessages).mockResolvedValue({
        messages: [mockMessage],
        total: 1,
      })

      const res = await request(app.server)
        .get("/api/discussions/d-1/messages")
        .expect(200)

      expect(res.body.data).toEqual([mockMessage])
      expect(res.body.meta.currentPage).toBe(1)
      expect(res.body.links.self).toContain("/api/discussions/d-1/messages")
    })

    it("должен поддерживать пагинацию", async () => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
      }))
      vi.mocked(mockService.getMessages).mockResolvedValue({
        messages,
        total: 150,
      })

      const res = await request(app.server)
        .get("/api/discussions/d-1/messages?page=2&limit=50")
        .expect(200)

      expect(res.body.meta.currentPage).toBe("2")
      expect(res.body.links.next).toBeDefined()
      expect(res.body.links.prev).toBeDefined()
    })

    it("не требует авторизации", async () => {
      vi.mocked(mockService.getMessages).mockResolvedValue({
        messages: [],
        total: 0,
      })

      await request(app.server).get("/api/discussions/d-1/messages").expect(200)
    })
  })

  describe("POST /api/discussions/:id/messages", () => {
    it("должен создать сообщение", async () => {
      vi.mocked(mockService.createMessage).mockResolvedValue(mockMessage)

      const res = await request(app.server)
        .post("/api/discussions/d-1/messages")
        .set("Authorization", "Bearer user-token")
        .send({ content: "Hello" })
        .expect(201)

      expect(res.body.data).toEqual(mockMessage)
    })

    it("должен создать ответ с parentId", async () => {
      vi.mocked(mockService.createMessage).mockResolvedValue({
        ...mockMessage,
        parentId: "parent-1",
      })

      await request(app.server)
        .post("/api/discussions/d-1/messages")
        .set("Authorization", "Bearer user-token")
        .send({ content: "Reply", parentId: "parent-1" })
        .expect(201)

      expect(mockService.createMessage).toHaveBeenCalledWith("d-1", 2, "Reply", "parent-1")
    })

    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server)
        .post("/api/discussions/d-1/messages")
        .send({ content: "Hello" })
        .expect(401)
    })
  })

  describe("PATCH /api/discussions/:id/messages/:messageId", () => {
    it("должен отредактировать своё сообщение", async () => {
      vi.mocked(mockService.updateMessage).mockResolvedValue({
        ...mockMessage,
        content: "Edited",
      })

      const res = await request(app.server)
        .patch("/api/discussions/d-1/messages/msg-1")
        .set("Authorization", "Bearer user-token")
        .send({ content: "Edited" })
        .expect(200)

      expect(res.body.data.content).toBe("Edited")
    })

    it("должен вернуть 404 если сообщение не найдено", async () => {
      vi.mocked(mockService.updateMessage).mockRejectedValue(new Error("Message not found"))

      const res = await request(app.server)
        .patch("/api/discussions/d-1/messages/not-found")
        .set("Authorization", "Bearer user-token")
        .send({ content: "Edited" })
        .expect(404)

      expect(res.body.error.code).toBe("not_found")
    })

    it("должен вернуть 403 при попытке редактировать чужое", async () => {
      vi.mocked(mockService.updateMessage).mockRejectedValue(
        new Error("You can only edit your own messages"),
      )

      const res = await request(app.server)
        .patch("/api/discussions/d-1/messages/msg-1")
        .set("Authorization", "Bearer user-token")
        .send({ content: "Edited" })
        .expect(403)

      expect(res.body.error.code).toBe("forbidden")
    })
  })

  describe("DELETE /api/discussions/:id/messages/:messageId", () => {
    it("должен удалить сообщение (админ)", async () => {
      vi.mocked(mockService.deleteMessage).mockResolvedValue(undefined)

      await request(app.server)
        .delete("/api/discussions/d-1/messages/msg-1")
        .set("Authorization", "Bearer admin-token")
        .expect(204)
    })

    it("должен вернуть 403 для обычного пользователя", async () => {
      vi.mocked(mockService.deleteMessage).mockRejectedValue(
        new Error("Only admins and moderators can delete messages"),
      )

      const res = await request(app.server)
        .delete("/api/discussions/d-1/messages/msg-1")
        .set("Authorization", "Bearer user-token")
        .expect(403)

      expect(res.body.error.code).toBe("forbidden")
    })

    it("должен вернуть 404 если сообщение не найдено", async () => {
      vi.mocked(mockService.deleteMessage).mockRejectedValue(new Error("Message not found"))

      const res = await request(app.server)
        .delete("/api/discussions/d-1/messages/not-found")
        .set("Authorization", "Bearer admin-token")
        .expect(404)

      expect(res.body.error.code).toBe("not_found")
    })
  })
})
