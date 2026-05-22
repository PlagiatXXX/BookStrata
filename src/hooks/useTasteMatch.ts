import { useMemo } from "react"
import { useQuery, useQueries } from "@tanstack/react-query"
import { getUserTierLists, fetchTierList } from "@/lib/tierListApi"
import type { ApiTierListResponse } from "@/types/api"

interface BookWithTier {
  title: string
  author: string | null
  tierIndex: number
}

export interface BookMatchDetail {
  title: string
  author: string | null
  viewedTierIndex: number
  userTierIndex: number
  tierDiff: number
}

export interface MatchedTierList {
  id: string
  title: string
  matchPercent: number
  commonBooks: number
  details: BookMatchDetail[]
}

function normalizeKey(title: string, author: string | null): string {
  return `${title.toLowerCase().trim()}|${(author || "").toLowerCase().trim()}`
}

function extractBooks(apiData: ApiTierListResponse): BookWithTier[] {
  const tierOrder = [...apiData.tiers].sort((a, b) => a.rank - b.rank)
  const indexByRank = new Map(tierOrder.map((t, i) => [t.id, i]))

  return apiData.tiers.flatMap((tier) =>
    tier.items.map((item) => ({
      title: item.book.title,
      author: item.book.author,
      tierIndex: indexByRank.get(tier.id) ?? -1,
    }))
  )
}

function buildBookMap(books: BookWithTier[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const b of books) {
    const key = normalizeKey(b.title, b.author)
    if (!map.has(key)) {
      map.set(key, b.tierIndex)
    }
  }
  return map
}

function calculateMatch(
  viewedBooks: BookWithTier[],
  userBooks: BookWithTier[],
): { matchPercent: number; commonBooks: number; details: BookMatchDetail[] } {
  const viewedMap = buildBookMap(viewedBooks)
  const userMap = buildBookMap(userBooks)
  const details: BookMatchDetail[] = []
  let common = 0

  for (const [key, viewedTier] of viewedMap) {
    const userTier = userMap.get(key)
    if (userTier !== undefined) {
      common++
      details.push({
        title: key.split("|")[0],
        author: key.split("|")[1] || null,
        viewedTierIndex: viewedTier,
        userTierIndex: userTier,
        tierDiff: Math.abs(viewedTier - userTier),
      })
    }
  }

  if (common === 0) return { matchPercent: 0, commonBooks: 0, details: [] }

  const totalUnique = viewedMap.size + userMap.size - common
  return {
    matchPercent: Math.round((common / totalUnique) * 100),
    commonBooks: common,
    details,
  }
}

export function useTasteMatch(
  viewedApiData: ApiTierListResponse | undefined,
  isReadOnly: boolean,
) {
  const { data: userLists } = useQuery({
    queryKey: ["userTierLists"],
    queryFn: () => getUserTierLists(1, 20),
    enabled: isReadOnly && !!viewedApiData,
    staleTime: 60 * 1000,
  })

  const userListIds = useMemo(
    () => (userLists?.data ?? []).map((l) => l.id).slice(0, 5),
    [userLists],
  )

  const fullDataResults = useQueries({
    queries: userListIds.map((id) => ({
      queryKey: ["tierList", id],
      queryFn: () => fetchTierList(id),
      staleTime: 60 * 1000,
    })),
  })

  const matches = useMemo((): MatchedTierList[] => {
    if (!viewedApiData) return []

    const viewedBooks = extractBooks(viewedApiData)
    const results: MatchedTierList[] = []

    for (let i = 0; i < fullDataResults.length; i++) {
      const userApiData = fullDataResults[i].data
      if (!userApiData) continue

      const userBooks = extractBooks(userApiData)
      const result = calculateMatch(viewedBooks, userBooks)

      if (result.commonBooks > 0) {
        results.push({
          id: userApiData.id,
          title: userApiData.title,
          matchPercent: result.matchPercent,
          commonBooks: result.commonBooks,
          details: result.details,
        })
      }
    }

    results.sort((a, b) => b.matchPercent - a.matchPercent)
    return results
  }, [viewedApiData, fullDataResults])

  const bestMatch = matches[0] ?? null
  const isLoading = userListIds.length > 0 && fullDataResults.some((r) => r.isLoading)

  return { bestMatch, allMatches: matches, isLoading, hasAny: matches.length > 0 }
}
