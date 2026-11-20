/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileStats } from "./ProfileStats"
import type { PublicUserStats, UserStats } from "@/lib/userApi"

const ownerStats: UserStats = {
  tierListsCount: 9,
  publishedCount: 2,
  templatesCount: 4,
  likesCount: 3,
  likesTodayCount: 1,
  totalBooks: 18,
  commentsCount: 5,
  lastActivity: null,
  totalActiveMinutes: 0,
}

const visitorStats: PublicUserStats = {
  tierListsCount: 9,
  publishedCount: 2,
  likesCount: 3,
  totalBooks: 18,
  commentsCount: 5,
  lastActivity: null,
}

/** Карточка-статистика, содержащая переданный label. */
function statCard(label: string): HTMLElement {
  return screen.getByText(label).closest(".profile-stat-card") as HTMLElement
}

describe("ProfileStats", () => {
  it("владелец видит правильное склонение для своих показателей", () => {
    render(<ProfileStats mode="owner" stats={ownerStats} />)

    expect(screen.getByText("9")).toBeInTheDocument()
    expect(screen.getByText("18")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(statCard("Тир-листов")).toBeInTheDocument()
    expect(statCard("Книг в тир-листах")).toBeInTheDocument()
    expect(statCard("Лайка на тир-листах")).toBeInTheDocument()
    expect(statCard("Комментариев")).toBeInTheDocument()
  })

  it("посетитель видит правильное склонение для показателей", () => {
    render(<ProfileStats mode="visitor" stats={visitorStats} />)

    expect(screen.getByText("9")).toBeInTheDocument()
    expect(screen.getByText("18")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(statCard("Тир-листов")).toBeInTheDocument()
    expect(statCard("Книг в тир-листах")).toBeInTheDocument()
    expect(statCard("Лайка на тир-листах")).toBeInTheDocument()
    expect(statCard("Комментариев")).toBeInTheDocument()
  })

  it("корректно склоняет слова в единственном числе (1)", () => {
    const singleStats: PublicUserStats = {
      tierListsCount: 1,
      publishedCount: 1,
      likesCount: 1,
      totalBooks: 1,
      commentsCount: 1,
      lastActivity: null,
    }
    render(<ProfileStats mode="visitor" stats={singleStats} />)

    expect(statCard("Тир-лист")).toBeInTheDocument()
    expect(statCard("Книга в тир-листах")).toBeInTheDocument()
    expect(statCard("Лайк на тир-листах")).toBeInTheDocument()
    expect(statCard("Комментарий")).toBeInTheDocument()
  })

  it("некликабельные карточки без cursor-pointer и без роли кнопки", () => {
    render(<ProfileStats mode="owner" stats={ownerStats} onOpenTierLists={vi.fn()} />)

    for (const label of ["Книг в тир-листах", "Лайка на тир-листах", "Комментариев"]) {
      const card = statCard(label)
      expect(card).not.toHaveClass("cursor-pointer")
      expect(card).not.toHaveAttribute("role", "button")
    }
  })

  it("клик по карточке Тир-листов вызывает onOpenTierLists", () => {
    const onOpenTierLists = vi.fn()
    render(
      <ProfileStats mode="visitor" stats={visitorStats} onOpenTierLists={onOpenTierLists} />,
    )

    const card = statCard("Тир-листов")
    expect(card).toHaveClass("cursor-pointer")
    fireEvent.click(card)
    expect(onOpenTierLists).toHaveBeenCalledTimes(1)
  })

  it("без onOpenTierLists карточка Тир-листов некликабельна", () => {
    render(<ProfileStats mode="visitor" stats={visitorStats} />)

    expect(statCard("Тир-листов")).not.toHaveClass("cursor-pointer")
    expect(statCard("Тир-листов")).not.toHaveAttribute("role", "button")
  })
})
