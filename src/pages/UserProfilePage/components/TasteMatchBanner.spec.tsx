/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TasteMatchBanner } from "./TasteMatchBanner"
import type { TasteMatchResult } from "@/lib/userApi"

const baseMatch: TasteMatchResult = {
  matchPercent: 73,
  commonBooks: 2,
  totalBooks: 10,
  matches: [
    {
      book: { title: "Дюна", author: "Фрэнк Герберт", coverImageUrl: null },
      tierInProfile: "S",
      tierInProfileRank: 0,
      tierInMine: "A",
      tierInMineRank: 1,
    },
    {
      book: { title: "Гиперион", author: "Дэн Симмонс", coverImageUrl: null },
      tierInProfile: "B",
      tierInProfileRank: 2,
      tierInMine: "B",
      tierInMineRank: 2,
    },
  ],
}

describe("TasteMatchBanner", () => {
  it("рендерит процент и число общих книг", () => {
    render(<TasteMatchBanner tasteMatch={baseMatch} />)

    expect(screen.getByText("73%")).toBeInTheDocument()
    expect(screen.getByText(/2 общих книги/)).toBeInTheDocument()
    expect(screen.getByText(/из 10/)).toBeInTheDocument()
  })

  it("раскрывает список общих книг с тирами", () => {
    render(<TasteMatchBanner tasteMatch={baseMatch} />)

    // До раскрытия списка книг нет
    expect(screen.queryByText(/Дюна/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Совпадение вкусов/ }))

    expect(screen.getByText(/Дюна/)).toBeInTheDocument()
    expect(screen.getByText(/Гиперион/)).toBeInTheDocument()
    expect(
      screen.getByText(/ваш тир → тир пользователя/i),
    ).toBeInTheDocument()
  })

  it("при commonBooks = 0 — компактная строка без раскрытия", () => {
    render(
      <TasteMatchBanner
        tasteMatch={{ matchPercent: 0, commonBooks: 0, totalBooks: 5 }}
      />,
    )

    expect(screen.getByText("0%")).toBeInTheDocument()
    expect(screen.getByText(/0 общих книг/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Совпадение вкусов/ }),
    ).not.toBeInTheDocument()
  })

  it("без matches список не раскрывается", () => {
    render(
      <TasteMatchBanner
        tasteMatch={{ matchPercent: 50, commonBooks: 1, totalBooks: 4 }}
      />,
    )

    expect(
      screen.queryByRole("button", { name: /Совпадение вкусов/ }),
    ).not.toBeInTheDocument()
  })
})
