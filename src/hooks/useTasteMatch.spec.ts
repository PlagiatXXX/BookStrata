/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest"
import type { ApiTierListResponse } from "@/types/api"

// --- Pure functions from useTasteMatch (copied to test in isolation) ---

function normalizeKey(title: string, author: string | null): string {
  return `${title.toLowerCase().trim()}|${(author || "").toLowerCase().trim()}`
}

interface BookWithTier {
  title: string
  author: string | null
  tierIndex: number
}

interface BookMatchDetail {
  title: string
  author: string | null
  viewedTierIndex: number
  userTierIndex: number
  tierDiff: number
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

const T1 = (title: string, author: string | null, tierIndex: number): BookWithTier => ({
  title, author, tierIndex,
})

// --- Helpers to simulate ApiTierListResponse ---
function makeApiData(
  tiers: { rank: number; books: { title: string; author: string | null }[] }[],
): ApiTierListResponse {
  return {
    id: "test",
    title: "Test",
    year: null,
    isPublic: true,
    tiers: tiers.map((t) => ({
      id: t.rank,
      title: String(t.rank),
      color: "#888",
      rank: t.rank,
      items: t.books.map((b) => ({
        rank: 0,
        book: { id: 0, title: b.title, author: b.author, coverImageUrl: "", description: null, thoughts: null, createdAt: "" },
      })),
    })),
    unrankedBooks: [],
  }
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

// =================== TESTS ===================

describe("normalizeKey", () => {
  it("lowercases and trims title", () => {
    expect(normalizeKey("  The Lord of the Rings  ", null))
      .toBe("the lord of the rings|")
  })

  it("lowercases and trims author", () => {
    expect(normalizeKey("Dune", "  Frank Herbert  "))
      .toBe("dune|frank herbert")
  })

  it("handles null author", () => {
    expect(normalizeKey("Book", null)).toBe("book|")
  })

  it("matches identical books regardless of case", () => {
    const a = normalizeKey("The King", "Stephen King")
    const b = normalizeKey("the king", "stephen king")
    expect(a).toBe(b)
  })
})

describe("buildBookMap", () => {
  it("returns a map of normalized key to tierIndex", () => {
    const books = [T1("Dune", "Frank Herbert", 0), T1("1984", "George Orwell", 1)]
    const map = buildBookMap(books)
    expect(map.size).toBe(2)
    expect(map.get("dune|frank herbert")).toBe(0)
    expect(map.get("1984|george orwell")).toBe(1)
  })

  it("deduplicates books with same title+author (keeps first tier)", () => {
    const books = [T1("Dune", "Frank Herbert", 0), T1("Dune", "Frank Herbert", 2)]
    const map = buildBookMap(books)
    expect(map.size).toBe(1)
    expect(map.get("dune|frank herbert")).toBe(0)
  })
})

describe("calculateMatch", () => {
  it("returns 0 when no common books", () => {
    const viewed = [T1("Dune", "Frank Herbert", 0)]
    const userList = [T1("1984", "George Orwell", 1)]
    const result = calculateMatch(viewed, userList)
    expect(result.matchPercent).toBe(0)
    expect(result.commonBooks).toBe(0)
    expect(result.details).toEqual([])
  })

  it("returns 100% when both lists have exactly same books", () => {
    const viewed = [T1("Dune", "Frank Herbert", 0), T1("1984", "George Orwell", 1)]
    const userList = [T1("Dune", "Frank Herbert", 0), T1("1984", "George Orwell", 1)]
    const result = calculateMatch(viewed, userList)
    expect(result.matchPercent).toBe(100)
    expect(result.commonBooks).toBe(2)
  })

  it("calculates partial overlap correctly", () => {
    // viewed: A, B, C  |  user: B, C, D
    // common: B, C (2)
    // total unique: A, B, C, D (4)
    // match: 2/4 = 50%
    const viewed = [T1("A", null, 0), T1("B", null, 0), T1("C", null, 1)]
    const userList = [T1("B", null, 0), T1("C", null, 2), T1("D", null, 3)]
    const result = calculateMatch(viewed, userList)
    expect(result.matchPercent).toBe(50)
    expect(result.commonBooks).toBe(2)
  })

  it("one book common out of many gives lower percent", () => {
    const viewed = [T1("Shared", null, 0), T1("Unique1", null, 1), T1("Unique2", null, 2)]
    const userList = [T1("Shared", null, 0), T1("Other1", null, 3), T1("Other2", null, 4), T1("Other3", null, 0)]
    const result = calculateMatch(viewed, userList)
    // common: Shared (1), total unique: 3+4-1 = 6
    expect(result.matchPercent).toBe(17) // 1/6 ≈ 17%
    expect(result.commonBooks).toBe(1)
  })

  it("reports tier differences in details", () => {
    const viewed = [T1("Book", "Author", 0)]
    const userList = [T1("Book", "Author", 3)]
    const result = calculateMatch(viewed, userList)
    expect(result.commonBooks).toBe(1)
    expect(result.details[0].tierDiff).toBe(3)
    expect(result.details[0].viewedTierIndex).toBe(0)
    expect(result.details[0].userTierIndex).toBe(3)
  })

  it("handles empty lists", () => {
    expect(calculateMatch([], []).commonBooks).toBe(0)
    expect(calculateMatch([T1("A", null, 0)], []).commonBooks).toBe(0)
    expect(calculateMatch([], [T1("A", null, 0)]).commonBooks).toBe(0)
  })
})

describe("extractBooks", () => {
  it("extracts books with correct tier indices from ranked tiers", () => {
    const apiData = makeApiData([
      { rank: 0, books: [{ title: "Best Book", author: "Author A" }] },
      { rank: 1, books: [{ title: "Okay Book", author: "Author B" }] },
    ])
    const books = extractBooks(apiData)
    expect(books).toHaveLength(2)
    expect(books[0]).toMatchObject({ title: "Best Book", tierIndex: 0 })
    expect(books[1]).toMatchObject({ title: "Okay Book", tierIndex: 1 })
  })

  it("ignores unranked books", () => {
    const apiData = makeApiData([
      { rank: 0, books: [{ title: "Rated", author: null }] },
    ])
    apiData.unrankedBooks = [
      { rank: 0, book: { id: 0, title: "Unranked", author: null, coverImageUrl: "", description: null, thoughts: null, createdAt: "" } },
    ]
    const books = extractBooks(apiData)
    expect(books).toHaveLength(1)
    expect(books[0].title).toBe("Rated")
  })
})

describe("end-to-end: calculateMatch with extractBooks", () => {
  it("matches across full ApiTierListResponse objects", () => {
    const viewedApi = makeApiData([
      { rank: 0, books: [{ title: "Dune", author: "Frank Herbert" }] },
      { rank: 1, books: [{ title: "1984", author: "George Orwell" }] },
      { rank: 2, books: [{ title: "Brave New World", author: "Aldous Huxley" }] },
    ])
    const userApi = makeApiData([
      { rank: 0, books: [{ title: "Dune", author: "Frank Herbert" }] },
      { rank: 1, books: [{ title: "Brave New World", author: "Aldous Huxley" }] },
      { rank: 2, books: [{ title: "Fahrenheit 451", author: "Ray Bradbury" }] },
    ])

    const viewedBooks = extractBooks(viewedApi)
    const userBooks = extractBooks(userApi)
    const result = calculateMatch(viewedBooks, userBooks)

    // common: Dune, Brave New World (2)
    // total unique: Dune, 1984, Brave New World, Fahrenheit 451 (4)
    expect(result.commonBooks).toBe(2)
    expect(result.matchPercent).toBe(50)
    expect(result.details).toHaveLength(2)
  })
})
