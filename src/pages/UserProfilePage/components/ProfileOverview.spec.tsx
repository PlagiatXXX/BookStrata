/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileOverview } from "./ProfileOverview"
import type { PublicUserDna } from "@/lib/userApi"
import type { TierListShort } from "@/lib/tierListApi"
import type { CategoryId } from "@/data/genre-taxonomy"

const dna: PublicUserDna = {
  archetypeName: "Архивариус",
  archetypeDesc: null,
  motto: "Каждая книга — файл в каталоге",
  ticketNumber: "BS-7492-X",
}

const tierLists: TierListShort[] = [
  {
    id: "tl-1",
    title: "Топ фэнтези",
    createdAt: "2024-06-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
    isPublic: true,
    likesCount: 5,
    booksCount: 12,
  },
]

const genres: CategoryId[] = ["fantasy", "sci-fi"]

/** DOM-порядок секций обзора по их aria-label. */
function sectionOrder(): string[] {
  const labels = ["Любимые жанры", "Читательский ДНК", "Достижения", "Публичные тир-листы"]
  return labels
    .filter((label) => {
      try {
        return !!screen.getByRole("region", { name: label })
      } catch {
        return false
      }
    })
    .sort((a, b) => {
      const ea = screen.getByRole("region", { name: a })
      const eb = screen.getByRole("region", { name: b })
      return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    })
}

function renderOverview(overrides?: Partial<Parameters<typeof ProfileOverview>[0]>) {
  const props: Parameters<typeof ProfileOverview>[0] = {
    mode: "owner",
    genres,
    dna,
    tierLists,
    tierListsLoading: false,
    onOpenTierList: vi.fn(),
    ...overrides,
  }
  return render(<ProfileOverview {...props} />)
}

describe("ProfileOverview", () => {
  it("собирает блоки в порядке §6.5: жанры → ДНК → достижения → тир-листы", () => {
    renderOverview({ achievementsSlot: <div>Слот достижений</div> })

    expect(sectionOrder()).toEqual([
      "Любимые жанры",
      "Читательский ДНК",
      "Публичные тир-листы",
      "Достижения",
    ])
    expect(screen.getByText("Слот достижений")).toBeInTheDocument()
  })

  it("без слота достижений рендерит только жанры, ДНК и тир-листы", () => {
    renderOverview()

    expect(sectionOrder()).toEqual([
      "Любимые жанры",
      "Читательский ДНК",
      "Публичные тир-листы",
    ])
  })

  it("пустые жанры оставляют блок жанров с предложением добавить", () => {
    renderOverview({ genres: [] })

    expect(screen.getByRole("region", { name: "Любимые жанры" })).toBeInTheDocument()
    expect(screen.getByText(/Выберите до 9 любимых жанров/)).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Читательский ДНК" })).toBeInTheDocument()
  })

  it("посетителю без ДНК блок ДНК показывается с сообщением", () => {
    renderOverview({ mode: "visitor", dna: null })

    expect(screen.getByRole("region", { name: "Читательский ДНК" })).toBeInTheDocument()
    expect(screen.getByText(/Пользователь пока не прошёл тест на читательский ДНК/)).toBeInTheDocument()
  })

  it("кнопка «Изменить» у владельца вызывает onEditGenres", () => {
    const onEditGenres = vi.fn()
    renderOverview({ onEditGenres })

    fireEvent.click(screen.getByRole("button", { name: "Изменить" }))
    expect(onEditGenres).toHaveBeenCalledTimes(1)
  })

  it("клик по карточке тир-листа вызывает onOpenTierList", () => {
    const onOpenTierList = vi.fn()
    renderOverview({ onOpenTierList })

    fireEvent.click(screen.getByRole("button", { name: /Топ фэнтези/ }))
    expect(onOpenTierList).toHaveBeenCalledWith("tl-1")
  })

  it("рендерит слот достижений внутри секции Достижения", () => {
    renderOverview({ achievementsSlot: <div data-testid="ach-slot">Слот достижений</div> })

    expect(screen.getByTestId("ach-slot")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Достижения" })).toBeInTheDocument()
  })
})
