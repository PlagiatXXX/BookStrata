/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useTasteMatch } from "./useTasteMatch"
import type { ApiTierListResponse } from "@/types/api"
import type { ReactNode } from "react"
import { createElement } from "react"

// Мокаем tierListApi
vi.mock("@/lib/tierListApi", () => ({
  apiGetTierListTasteMatch: vi.fn(),
}))

import { apiGetTierListTasteMatch } from "@/lib/tierListApi"

const mockGet = apiGetTierListTasteMatch as ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

const sampleApiData: ApiTierListResponse = {
  id: "list-1",
  slug: "my-list",
  title: "My List",
  year: null,
  isPublic: true,
  user: { id: 1, username: "author1" },
  tiers: [
    {
      id: 1,
      title: "S",
      color: "#ff7f7f",
      rank: 0,
      items: [
        {
          rank: 0,
          book: {
            id: 1,
            title: "Dune",
            author: "Frank Herbert",
            coverImageUrl: "/dune.jpg",
            description: null,
            thoughts: null,
            createdAt: "",
          },
        },
      ],
    },
  ],
  unrankedBooks: [],
}

describe("useTasteMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("возвращает hasAny=false когда нет apiData", () => {
    const { result } = renderHook(
      () => useTasteMatch(undefined, true),
      { wrapper: createWrapper() },
    )
    expect(result.current.hasAny).toBe(false)
    expect(result.current.bestMatch).toBeNull()
  })

  it("возвращает hasAny=false когда isReadOnly=false", () => {
    const { result } = renderHook(
      () => useTasteMatch(sampleApiData, false),
      { wrapper: createWrapper() },
    )
    expect(result.current.hasAny).toBe(false)
    // Запрос не должен был выполниться
    expect(mockGet).not.toHaveBeenCalled()
  })

  it("выполняет запрос когда isReadOnly=true и apiData есть", async () => {
    mockGet.mockResolvedValue({
      matchPercent: 50,
      commonBooks: 2,
      totalBooks: 5,
      matches: [
        {
          book: { title: "Dune", author: "Frank Herbert", coverImageUrl: "/dune.jpg" },
          tierInList: "S",
          tierInListId: 1,
          tierInListRank: 0,
          tierInMine: "A",
          tierInMineId: 2,
          tierInMineRank: 1,
        },
      ],
    })

    const { result } = renderHook(
      () => useTasteMatch(sampleApiData, true),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGet).toHaveBeenCalledWith("my-list")
    expect(result.current.hasAny).toBe(true)
    expect(result.current.bestMatch).not.toBeNull()
    expect(result.current.bestMatch!.matchPercent).toBe(50)
    expect(result.current.bestMatch!.commonBooks).toBe(2)
    expect(result.current.bestMatch!.details).toHaveLength(1)
  })

  it("возвращает hasAny=false когда commonBooks=0", async () => {
    mockGet.mockResolvedValue({
      matchPercent: 0,
      commonBooks: 0,
      totalBooks: 5,
      matches: [],
    })

    const { result } = renderHook(
      () => useTasteMatch(sampleApiData, true),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.hasAny).toBe(false)
    expect(result.current.bestMatch).toBeNull()
  })

  it("использует id если slug нет", async () => {
    const dataWithoutSlug: ApiTierListResponse = {
      ...sampleApiData,
      slug: undefined,
    }

    mockGet.mockResolvedValue({
      matchPercent: 0,
      commonBooks: 0,
      totalBooks: 0,
      matches: [],
    })

    renderHook(
      () => useTasteMatch(dataWithoutSlug, true),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(mockGet).toHaveBeenCalled())
    expect(mockGet).toHaveBeenCalledWith("list-1")
  })
})
