/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProfileDnaCard } from "./ProfileDnaCard"
import type { PublicUserDna } from "@/lib/userApi"

const dna: PublicUserDna = {
  archetypeName: "Архивариус",
  archetypeDesc: "Собирает прочитанное в систему",
  motto: "Каждая книга — файл в каталоге",
  ticketNumber: "BS-7492-X",
}

describe("ProfileDnaCard", () => {
  it("полученная ДНК: вся карточка — ссылка на сравнение вкусов ДНК", () => {
    render(<ProfileDnaCard dna={dna} isOwner={false} />)

    const link = screen.getByRole("link", { name: /Архивариус/ })
    expect(link).toHaveAttribute(
      "href",
      "/reading-dna?ticket=BS-7492-X&tab=compare",
    )
  })

  it("карточка показывает архетип, девиз и номер билета", () => {
    render(<ProfileDnaCard dna={dna} isOwner={false} />)

    expect(screen.getByText("Архивариус")).toBeInTheDocument()
    expect(screen.getByText(/Каждая книга — файл в каталоге/)).toBeInTheDocument()
    expect(screen.getByText("#BS-7492-X")).toBeInTheDocument()
  })

  it("без ДНК у владельца — подзаголовок и CTA «Пройти тест» на /reading-dna", () => {
    render(<ProfileDnaCard dna={null} isOwner />)

    expect(screen.getByText("Литературный психотип, оси восприятия и совместимость")).toBeInTheDocument()
    expect(screen.getByText(/Вы ещё не прошли тест на читательский ДНК/)).toBeInTheDocument()
    const cta = screen.getByRole("link", { name: /Пройти тест/ })
    expect(cta).toHaveAttribute("href", "/reading-dna")
  })

  it("без ДНК у посетителя показывает заглушку о непройденном тесте", () => {
    render(<ProfileDnaCard dna={null} isOwner={false} />)

    expect(screen.getByRole("region", { name: "Читательский ДНК" })).toBeInTheDocument()
    expect(screen.getByText(/Пользователь пока не прошёл тест на читательский ДНК/)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Пройти тест/ })).not.toBeInTheDocument()
  })
})
