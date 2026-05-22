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
  getActiveBattles,
  getBattleById,
  createBattle,
  voteInBattle,
  closeBattle,
  applyToBattle,
  applyGeneral,
  getApplications,
  reviewApplication,
  getForumStats,
} from "./battlesApi"

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    statusText: status === 401 ? "Unauthorized" : "OK",
  }
}

describe("battlesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getActiveBattles", () => {
    it("должен запросить GET /battles и вернуть список битв", async () => {
      const mockBattles = [{ id: "b1", title: "Battle 1" }]
      mockFetch.mockResolvedValue(mockResponse({ data: mockBattles }))

      const result = await getActiveBattles()

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result).toEqual(mockBattles)
    })

    it("должен выбросить ошибку при неудачном запросе", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ error: { message: "Server error" } }, 500),
      )

      await expect(getActiveBattles()).rejects.toThrow("Server error")
    })
  })

  describe("getBattleById", () => {
    it("должен запросить GET /battles/:id", async () => {
      const mockBattle = { id: "b1", title: "Test Battle" }
      mockFetch.mockResolvedValue(mockResponse({ data: mockBattle }))

      const result = await getBattleById("b1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles/b1",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result).toEqual(mockBattle)
    })
  })

  describe("createBattle", () => {
    it("должен запросить POST /battles с телом", async () => {
      const mockBattle = { id: "b1", title: "New Battle" }
      mockFetch.mockResolvedValue(mockResponse({ data: mockBattle }, 201))

      const result = await createBattle({
        title: "New Battle",
        type: "weekly",
        endTime: new Date().toISOString(),
        participantTierListIds: ["tl-1", "tl-2"],
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles",
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        }),
      )
      expect(result).toEqual(mockBattle)
    })
  })

  describe("voteInBattle", () => {
    it("должен запросить POST /battles/:id/vote", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: { success: true } }))

      const result = await voteInBattle("b1", "tl-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles/b1/vote",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tierListId: "tl-1" }),
        }),
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe("closeBattle", () => {
    it("должен запросить POST /battles/:id/close", async () => {
      const mockBattle = { id: "b1", status: "completed" }
      mockFetch.mockResolvedValue(mockResponse({ data: mockBattle }))

      const result = await closeBattle("b1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles/b1/close",
        expect.objectContaining({ method: "POST" }),
      )
      expect(result).toEqual(mockBattle)
    })
  })

  describe("applyToBattle", () => {
    it("должен запросить POST /battles/:id/apply", async () => {
      const mockApp = {
        id: 1,
        battleId: "b1",
        userId: 1,
        tierListId: "tl-1",
        status: "pending",
      } as any
      mockFetch.mockResolvedValue(mockResponse({ data: mockApp }, 201))

      const result = await applyToBattle("b1", "tl-1", "Pick me!")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles/b1/apply",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tierListId: "tl-1", message: "Pick me!" }),
        }),
      )
      expect(result).toEqual(mockApp)
    })

    it("должен отправить заявку без сообщения", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: { id: 1 } }, 201))

      await applyToBattle("b1", "tl-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles/b1/apply",
        expect.objectContaining({
          body: JSON.stringify({ tierListId: "tl-1", message: undefined }),
        }),
      )
    })
  })

  describe("applyGeneral", () => {
    it("должен запросить POST /battles/apply", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: { id: 1 } }, 201))

      const result = await applyGeneral("tl-1", "Want to join")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles/apply",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tierListId: "tl-1", message: "Want to join" }),
        }),
      )
      expect(result).toEqual({ id: 1 })
    })
  })

  describe("getApplications", () => {
    it("должен запросить GET /battles/:id/applications", async () => {
      const mockApps = [{ id: 1, status: "pending" }]
      mockFetch.mockResolvedValue(mockResponse({ data: mockApps }))

      const result = await getApplications("b1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles/b1/applications",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result).toEqual(mockApps)
    })
  })

  describe("reviewApplication", () => {
    it("должен запросить PATCH /battles/:id/applications/:appId", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: { success: true } }))

      const result = await reviewApplication("b1", 1, "approved")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles/b1/applications/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "approved" }),
        }),
      )
      expect(result).toEqual({ success: true })
    })

    it("должен отклонить заявку", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: { success: true } }))

      const result = await reviewApplication("b1", 1, "rejected")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/battles/b1/applications/1",
        expect.objectContaining({
          body: JSON.stringify({ status: "rejected" }),
        }),
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe("getForumStats", () => {
    it("должен получать статистику форума", async () => {
      const mockStats = { totalUsers: 100, activeBattles: 5 }
      mockFetch.mockResolvedValue(mockResponse(mockStats))

      const result = await getForumStats()

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/forum/stats",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result).toEqual(mockStats)
    })

    it("должен работать при нулевых значениях", async () => {
      mockFetch.mockResolvedValue(mockResponse({ totalUsers: 0, activeBattles: 0 }))

      const result = await getForumStats()

      expect(result).toEqual({ totalUsers: 0, activeBattles: 0 })
    })

    it("должен обрабатывать ошибку сервера", async () => {
      mockFetch.mockResolvedValue(mockResponse(null, 500))

      await expect(getForumStats()).rejects.toThrow()
    })
  })
})
