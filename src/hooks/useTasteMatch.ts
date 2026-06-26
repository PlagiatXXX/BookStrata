import { useQuery } from "@tanstack/react-query"
import {
  apiGetTierListTasteMatch,
  type TierListTasteMatchResult,
} from "@/lib/tierListApi"
import type { ApiTierListResponse } from "@/types/api"

export interface BookMatchDetail {
  title: string
  author: string | null
  coverImageUrl: string
  viewedTierIndex: number
  userTierIndex: number
  tierDiff: number
}

export interface MatchedTierList {
  matchPercent: number
  commonBooks: number
  details: BookMatchDetail[]
}

function detailsFromMatches(
  result: TierListTasteMatchResult,
): BookMatchDetail[] {
  // Собираем все уникальные rank тиров с обеих сторон и сортируем
  const listRanks = result.matches
    .map((m) => m.tierInListRank)
    .filter((r): r is number => r !== null)
  const userRanks = result.matches
    .map((m) => m.tierInMineRank)
    .filter((r): r is number => r !== null)
  const allRanks = [...new Set([...listRanks, ...userRanks])].sort(
    (a, b) => a - b,
  )
  const rankIndex = new Map(allRanks.map((r, i) => [r, i]))

  return result.matches.map((m) => {
    const viewedIdx = m.tierInListRank != null
      ? (rankIndex.get(m.tierInListRank) ?? 0)
      : 5
    const userIdx = m.tierInMineRank != null
      ? (rankIndex.get(m.tierInMineRank) ?? 0)
      : 5

    return {
      title: m.book.title,
      author: m.book.author,
      coverImageUrl: m.book.coverImageUrl,
      viewedTierIndex: viewedIdx,
      userTierIndex: userIdx,
      tierDiff: Math.abs(viewedIdx - userIdx),
    }
  })
}

export function useTasteMatch(
  viewedApiData: ApiTierListResponse | undefined,
  isReadOnly: boolean,
) {
  // Используем slug для запроса, если есть; иначе id
  const tierListKey = viewedApiData?.slug ?? viewedApiData?.id

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tierListTasteMatch", tierListKey],
    queryFn: () => apiGetTierListTasteMatch(tierListKey!),
    enabled: isReadOnly && !!tierListKey,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  })

  if (!data || data.commonBooks === 0) {
    return { bestMatch: null, allMatches: [], isLoading, hasAny: false }
  }

  const details = detailsFromMatches(data)
  const bestMatch: MatchedTierList = {
    matchPercent: data.matchPercent,
    commonBooks: data.commonBooks,
    details,
  }

  return {
    bestMatch,
    allMatches: [bestMatch],
    isLoading,
    hasAny: true,
    isError,
  }
}
