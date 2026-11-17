/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileTierLists } from "./ProfileTierLists"
import type { TierListShort } from "@/lib/tierListApi"

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
  {
    id: "tl-2",
    title: "Классика на вечер",
    createdAt: "2024-06-02T00:00:00.000Z",
    updatedAt: "2024-06-02T00:00:00.000Z",
    isPublic: true,
    likesCount: 2,
    booksCount: 7,
  },
]

describe("ProfileTierLists", () => {
  it("пока идёт загрузка — пустого состояния и карточек нет", () => {
    render(
      <ProfileTierLists tierLists={[]} isLoading isOwner={false} onOpen={vi.fn()} />,
    )

    expect(screen.queryByText("Пока нет публичных тир-листов")).not.toBeInTheDocument()
    expect(screen.queryByText("Топ фэнтези")).not.toBeInTheDocument()
  })

  it("пустое состояние: «Пока нет публичных тир-листов»", () => {
    render(
      <ProfileTierLists tierLists={[]} isLoading={false} isOwner={false} onOpen={vi.fn()} />,
    )

    expect(screen.getByText("Пока нет публичных тир-листов")).toBeInTheDocument()
  })

  it("рендерит превью до 6 карточек с числом книг и лайков", () => {
    const many: TierListShort[] = Array.from({ length: 8 }, (_, i) => ({
      id: `tl-${i}`,
      title: `Список ${i}`,
      createdAt: "2024-06-01T00:00:00.000Z",
      updatedAt: "2024-06-01T00:00:00.000Z",
      isPublic: true,
      likesCount: (i + 1) * 3,
      booksCount: (i + 1) * 7,
    }))
    render(
      <ProfileTierLists tierLists={many} isLoading={false} isOwner={false} onOpen={vi.fn()} />,
    )

    expect(screen.getAllByRole("button", { name: /Список / })).toHaveLength(6)
    expect(screen.getByText(/Список 0/)).toBeInTheDocument()
    expect(screen.queryByText("Список 6")).not.toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument() // книги первого списка
    expect(screen.getByText("3")).toBeInTheDocument() // лайки первого списка
  })

  it("клик по карточке вызывает onOpen с id тир-листа", () => {
    const onOpen = vi.fn()
    render(
      <ProfileTierLists tierLists={tierLists} isLoading={false} isOwner={false} onOpen={onOpen} />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Топ фэнтези/ }))
    expect(onOpen).toHaveBeenCalledWith("tl-1")
  })

  it("открывает по Enter с клавиатуры", () => {
    const onOpen = vi.fn()
    render(
      <ProfileTierLists tierLists={tierLists} isLoading={false} isOwner={false} onOpen={onOpen} />,
    )

    fireEvent.keyDown(screen.getByRole("button", { name: /Топ фэнтези/ }), {
      key: "Enter",
    })
    expect(onOpen).toHaveBeenCalledWith("tl-1")
  })

  it("у владельца есть ссылка «Управлять в дашборде», у посетителя — нет", () => {
    const { unmount } = render(
      <ProfileTierLists tierLists={[]} isLoading={false} isOwner onOpen={vi.fn()} />,
    )
    expect(screen.getByRole("link", { name: "Управлять в дашборде" })).toHaveAttribute(
      "href",
      "/dashboard",
    )
    unmount()

    render(
      <ProfileTierLists tierLists={[]} isLoading={false} isOwner={false} onOpen={vi.fn()} />,
    )
    expect(screen.queryByText("Управлять в дашборде")).not.toBeInTheDocument()
  })
})
