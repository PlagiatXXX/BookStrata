/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ProfileDnaCard } from "./ProfileDnaCard"
import type { PublicUserDna } from "@/lib/userApi"

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

const dna: PublicUserDna = {
  archetypeName: "Архивариус",
  archetypeDesc: "Собирает прочитанное в систему",
  motto: "Каждая книга — файл в каталоге",
  ticketNumber: "BS-7492-X",
}

describe("ProfileDnaCard", () => {
  it("полученная ДНК: вся карточка — ссылка на читательский билет", () => {
    render(<ProfileDnaCard dna={dna} isOwner={false} />)

    const link = screen.getByRole("link", { name: /Архивариус/ })
    expect(link).toHaveAttribute(
      "href",
      "/reading-dna?ticket=BS-7492-X",
    )
  })

  it("у владельца карточка также ведёт на просмотр билета", () => {
    render(<ProfileDnaCard dna={dna} isOwner={true} />)

    const link = screen.getByRole("link", { name: /Архивариус/ })
    expect(link).toHaveAttribute(
      "href",
      "/reading-dna?ticket=BS-7492-X",
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

  it("при наличии осей и книг пробрасывает священные книги и криптонит в ArchivalTicketCard", () => {
    const axes = {
      storyFocus: 60,
      emotionalWeight: 70,
      pace: 50,
      darkness: 80,
      scope: 40,
      complexity: 90,
    }
    const favoriteBooks = [
      { title: "Мастер и Маргарита", author: "М. Булгаков", coverImageUrl: "https://example.com/master.jpg" },
      { title: "1984", author: "Дж. Оруэлл" },
    ]
    const kryptoniteBook = {
      title: "Сумерки",
      author: "С. Майер",
    }

    renderWithClient(
      <ProfileDnaCard
        dna={dna}
        isOwner={false}
        axes={axes}
        favoriteBooks={favoriteBooks}
        kryptoniteBook={kryptoniteBook}
      />
    )

    expect(screen.getByAltText("Мастер и Маргарита")).toBeInTheDocument()
    expect(screen.getByText("Сумерки")).toBeInTheDocument()
  })
})
