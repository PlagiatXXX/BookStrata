/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TasteMatchBanner } from "./TasteMatchBanner"
import type { ApiTierListResponse } from "@/types/api"

vi.mock("@/hooks/useTasteMatch", () => ({
  useTasteMatch: vi.fn(),
}))

import { useTasteMatch } from "@/hooks/useTasteMatch"

const mockUseTasteMatch = vi.mocked(useTasteMatch)

const fakeApiData = {
  id: "list-1",
  slug: "test-list",
  title: "Test List",
  tiers: [],
  user: { id: 1, username: "tester" },
} as unknown as ApiTierListResponse

describe("TasteMatchBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("не рендерится, если isReadOnly = false", () => {
    mockUseTasteMatch.mockReturnValue({
      bestMatch: {
        matchPercent: 80,
        commonBooks: 1,
        details: [],
      },
      allMatches: [],
      isLoading: false,
      hasAny: true,
      isError: false,
    })

    const { container } = render(
      <TasteMatchBanner apiData={fakeApiData} isReadOnly={false} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it("отображает реальные названия тиров и правильный порядок (ваш тир ПЕРЕД тиром автора)", () => {
    mockUseTasteMatch.mockReturnValue({
      bestMatch: {
        matchPercent: 75,
        commonBooks: 1,
        details: [
          {
            title: "Дюна",
            author: "Фрэнк Герберт",
            coverImageUrl: "/dune.jpg",
            viewedTierIndex: 0,
            userTierIndex: 5,
            viewedTierTitle: "Шедевр",
            userTierTitle: "Дно",
            tierDiff: 5,
          },
        ],
      },
      allMatches: [],
      isLoading: false,
      hasAny: true,
      isError: false,
    })

    render(
      <TasteMatchBanner
        apiData={fakeApiData}
        isReadOnly={true}
        authorUsername="author1"
      />,
    )

    // Раскрываем аккордеон
    const toggleButton = screen.getByRole("button")
    fireEvent.click(toggleButton)

    // Проверяем наличие текстов
    const userBadge = screen.getByText("Дно")
    const authorBadge = screen.getByText("Шедевр")

    expect(userBadge).toBeInTheDocument()
    expect(authorBadge).toBeInTheDocument()

    // Проверяем правильный порядок в DOM:
    // элемент с вашим тиром ("Дно") идёт ПЕРЕД элементом с тиром автора ("Шедевр")
    const position = userBadge.compareDocumentPosition(authorBadge)
    expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)

    // Отображается иконка со стрелкой вверх и тайтлом "Автор оценил выше"
    const upIcon = screen.getByTitle("Автор оценил выше")
    expect(upIcon).toBeInTheDocument()
  })

  it("использует буквенный фолбэк (S/A/B/C/D/F), если viewedTierTitle и userTierTitle равны null или пустым строкам", () => {
    mockUseTasteMatch.mockReturnValue({
      bestMatch: {
        matchPercent: 60,
        commonBooks: 1,
        details: [
          {
            title: "1984",
            author: "Джордж Оруэлл",
            coverImageUrl: "/1984.jpg",
            viewedTierIndex: 0, // S
            userTierIndex: 2, // B
            viewedTierTitle: "",
            userTierTitle: null,
            tierDiff: 2,
          },
        ],
      },
      allMatches: [],
      isLoading: false,
      hasAny: true,
      isError: false,
    })

    render(<TasteMatchBanner apiData={fakeApiData} isReadOnly={true} />)

    fireEvent.click(screen.getByRole("button"))

    // Буквенный фолбэк: ваш тир B, автора S
    const userBadge = screen.getByText("B")
    const authorBadge = screen.getByText("S")

    expect(userBadge).toBeInTheDocument()
    expect(authorBadge).toBeInTheDocument()

    // Порядок: B перед S
    const position = userBadge.compareDocumentPosition(authorBadge)
    expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  describe("стрелка разницы оценок", () => {
    it("отображает Minus с тайтлом 'Оценки близки или совпадают', если tierDiff <= 1", () => {
      mockUseTasteMatch.mockReturnValue({
        bestMatch: {
          matchPercent: 90,
          commonBooks: 1,
          details: [
            {
              title: "Книга",
              author: "Автор",
              coverImageUrl: "",
              viewedTierIndex: 1,
              userTierIndex: 2,
              viewedTierTitle: "A",
              userTierTitle: "B",
              tierDiff: 1,
            },
          ],
        },
        allMatches: [],
        isLoading: false,
        hasAny: true,
        isError: false,
      })

      render(<TasteMatchBanner apiData={fakeApiData} isReadOnly={true} />)
      fireEvent.click(screen.getByRole("button"))

      expect(screen.getByTitle("Оценки близки или совпадают")).toBeInTheDocument()
    })

    it("отображает ChevronDown с тайтлом 'Автор оценил ниже', если viewedTierIndex > userTierIndex", () => {
      mockUseTasteMatch.mockReturnValue({
        bestMatch: {
          matchPercent: 40,
          commonBooks: 1,
          details: [
            {
              title: "Книга",
              author: "Автор",
              coverImageUrl: "",
              viewedTierIndex: 4, // D (автор оценил ниже)
              userTierIndex: 1, // A (пользователь оценил выше)
              viewedTierTitle: "D",
              userTierTitle: "A",
              tierDiff: 3,
            },
          ],
        },
        allMatches: [],
        isLoading: false,
        hasAny: true,
        isError: false,
      })

      render(<TasteMatchBanner apiData={fakeApiData} isReadOnly={true} />)
      fireEvent.click(screen.getByRole("button"))

      expect(screen.getByTitle("Автор оценил ниже")).toBeInTheDocument()
    })
  })
})
