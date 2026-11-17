/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { createElement } from "react"
import { useUserAchievements } from "./useUserAchievements"
import type { PublicAchievement } from "@/lib/achievementApi"

vi.mock("@/lib/achievementApi", () => ({
  apiGetUserAchievements: vi.fn(),
}))

import { apiGetUserAchievements } from "@/lib/achievementApi"

const mockGet = apiGetUserAchievements as ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

const mockAchievements: PublicAchievement[] = [
  {
    id: "bookworm_1",
    title: "Первая полка",
    description: "Создайте первый тир-лист",
    iconUrl: "/icons/bookworm.svg",
    xpValue: 50,
    earnedAt: "2026-11-01T12:00:00.000Z",
  },
  {
    id: "critic",
    title: "Критик",
    description: "Оставьте мысли о книгах",
    iconUrl: null,
    xpValue: 100,
    earnedAt: "2026-11-10T08:30:00.000Z",
  },
]

describe("useUserAchievements", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("запрашивает достижения пользователя, когда id передан", async () => {
    mockGet.mockResolvedValue(mockAchievements)

    const { result } = renderHook(() => useUserAchievements("42"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockGet).toHaveBeenCalledWith("42")
    expect(result.current.data).toEqual(mockAchievements)
    expect(result.current.isError).toBe(false)
  })

  it("не выполняет запрос без id", () => {
    renderHook(() => useUserAchievements(undefined), {
      wrapper: createWrapper(),
    })

    expect(mockGet).not.toHaveBeenCalled()
  })

  it("возвращает ошибку при неудачном запросе", async () => {
    mockGet.mockRejectedValue(new Error("User not found"))

    const { result } = renderHook(() => useUserAchievements("999"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isError).toBe(true)
    expect(result.current.data).toBeUndefined()
  })
})
