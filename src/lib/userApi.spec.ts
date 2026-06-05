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

import { apiGetPublicUser, apiGetUserTierLists, apiGetTasteMatch } from "./userApi"

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    statusText: status === 401 ? "Unauthorized" : "OK",
  }
}

const mockPublicUser = {
  id: 1,
  username: "testuser",
  avatarUrl: "https://example.com/avatar.jpg",
  xp: 150,
  title: "Книжный червь",
  role: "admin",
  createdAt: "2024-01-01T00:00:00.000Z",
  stats: {
    tierListsCount: 5,
    publishedCount: 3,
    likesCount: 10,
    totalBooks: 20,
    lastActivity: "2024-06-01T00:00:00.000Z",
  },
}

describe("userApi", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("apiGetPublicUser", () => {
    it("должен запросить GET /users/:id", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: mockPublicUser }))

      const result = await apiGetPublicUser("1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/users/1",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result).toEqual(mockPublicUser)
    })

    it("должен выбросить ошибку при 404", async () => {
      mockFetch.mockResolvedValue(mockResponse({ error: { message: "User not found" } }, 404))

      await expect(apiGetPublicUser("999")).rejects.toThrow("User not found")
    })

    it("должен выбросить ошибку при 401", async () => {
      mockFetch.mockResolvedValue(mockResponse({ error: { message: "Unauthorized" } }, 401))

      await expect(apiGetPublicUser("1")).rejects.toThrow("Требуется авторизация")
    })
  })

  describe("apiGetUserTierLists", () => {
    const mockPageData = {
      data: [
        {
          id: "tl-1",
          title: "My List",
          likesCount: 5,
          booksCount: 3,
          updatedAt: "2024-06-01T00:00:00.000Z",
          user: { username: "testuser", avatarUrl: null },
        },
      ],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
      links: {
        self: "/api/users/1/tier-lists?page=1&pageSize=10",
        last: "/api/users/1/tier-lists?page=1&pageSize=10",
      },
    }

    it("должен запросить GET /users/:id/tier-lists с параметрами", async () => {
      mockFetch.mockResolvedValue(mockResponse(mockPageData))

      const result = await apiGetUserTierLists("1", 1, 10)

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/users/1/tier-lists?page=1&pageSize=10",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result).toEqual(mockPageData)
    })

    it("должен использовать значения по умолчанию", async () => {
      mockFetch.mockResolvedValue(mockResponse(mockPageData))

      await apiGetUserTierLists("1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/users/1/tier-lists?page=1&pageSize=10",
        expect.any(Object),
      )
    })

    it("должен выбросить ошибку при неудаче", async () => {
      mockFetch.mockResolvedValue(mockResponse({ error: { message: "Server error" } }, 500))

      await expect(apiGetUserTierLists("1", 1, 10)).rejects.toThrow("Server error")
    })
  })

  describe("apiGetTasteMatch", () => {
    const mockTasteMatch = {
      matchPercent: 25,
      commonBooks: 1,
      totalBooks: 3,
    }

    it("должен запросить GET /users/:id/taste-match", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: mockTasteMatch }))

      const result = await apiGetTasteMatch("1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/users/1/taste-match",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result).toEqual(mockTasteMatch)
    })

    it("должен вернуть 0% если нет совпадений", async () => {
      const noMatch = { matchPercent: 0, commonBooks: 0, totalBooks: 10 }
      mockFetch.mockResolvedValue(mockResponse({ data: noMatch }))

      const result = await apiGetTasteMatch("2")

      expect(result.matchPercent).toBe(0)
      expect(result.commonBooks).toBe(0)
    })
  })
})
