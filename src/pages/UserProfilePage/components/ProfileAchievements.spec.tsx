/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileAchievements } from "./ProfileAchievements"
import type { Achievement, PublicAchievement } from "@/lib/achievementApi"

/** Владелец: заработанные, в процессе, закрытое и секретное нераскрытое. */
const ownerAchievements: Achievement[] = [
  {
    id: "a1",
    title: "Первая книга",
    description: "Прочитай первую книгу",
    iconUrl: "📚",
    xpValue: 10,
    isEarned: true,
    earnedAt: "2025-03-01T00:00:00Z",
    isSecret: false,
  },
  {
    id: "a2",
    title: "Скорочтатель",
    description: "Прочитай десять книг",
    iconUrl: "⚡",
    xpValue: 20,
    isEarned: true,
    earnedAt: "2025-06-01T00:00:00Z",
    isSecret: false,
    progress: null,
  },
  {
    id: "a3",
    title: "Марафонец",
    description: "Прочитай 50 книг",
    iconUrl: "🏃",
    xpValue: 50,
    isEarned: false,
    earnedAt: null,
    isSecret: false,
    progress: { current: 12, target: 50 },
  },
  {
    id: "a4",
    title: "Коллекционер",
    description: "Собери 20 книг в тир-листы",
    xpValue: 30,
    isEarned: false,
    earnedAt: null,
    isSecret: false,
    progress: { current: 5, target: 20 },
  },
  {
    id: "a5",
    title: "Закрытое",
    description: "Без прогресса",
    xpValue: 100,
    isEarned: false,
    earnedAt: null,
    isSecret: false,
  },
  {
    id: "a6",
    title: "Ночное дежурство",
    description: "Тайное описание",
    xpValue: 200,
    isEarned: false,
    earnedAt: null,
    isSecret: true,
  },
]

/** Посетитель: только полученные (публичный эндпоинт). */
const visitorAchievements: PublicAchievement[] = [
  {
    id: "p1",
    title: "Книжный червь",
    description: "Прочитай 100 книг",
    iconUrl: "🏆",
    xpValue: 75,
    earnedAt: "2025-02-10T00:00:00Z",
  },
]

/** Названия достижений в порядке DOM. */
function getTitles(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll(".profile-achievement-card__title"),
  ).map((el) => el.textContent ?? "")
}

function getCards(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll(".profile-achievement-card"),
  ) as HTMLElement[]
}

function getFilter(label: string): HTMLElement {
  return screen.getByRole("button", { name: label })
}

describe("ProfileAchievements", () => {
  it("владелец: полученные по earnedAt desc, затем в процессе по проценту, затем закрытые", () => {
    const { container } = render(
      <ProfileAchievements mode="owner" achievements={ownerAchievements} />,
    )

    // a2 (июнь 2025) раньше a1 (март 2025);
    // a4 (5/20 = 25%) раньше a3 (12/50 = 24%);
    // закрытые — по названию.
    expect(getTitles(container)).toEqual([
      "Скорочтатель",
      "Первая книга",
      "Коллекционер",
      "Марафонец",
      "Закрытое",
      "Секретное достижение",
    ])
  })

  it("владелец: фильтры Все / Получено / В процессе / Закрыто работают", () => {
    const { container } = render(
      <ProfileAchievements mode="owner" achievements={ownerAchievements} />,
    )

    expect(getCards(container)).toHaveLength(6)

    fireEvent.click(getFilter("Получено"))
    expect(getTitles(container)).toEqual(["Скорочтатель", "Первая книга"])

    fireEvent.click(getFilter("В процессе"))
    expect(getTitles(container)).toEqual(["Коллекционер", "Марафонец"])

    fireEvent.click(getFilter("Закрыто"))
    expect(getTitles(container)).toEqual(["Закрытое", "Секретное достижение"])

    fireEvent.click(getFilter("Все"))
    expect(getCards(container)).toHaveLength(6)
  })

  it("посетитель: только полученные, дата получения, без фильтров и прогресса", () => {
    const { container } = render(
      <ProfileAchievements
        mode="visitor"
        achievements={visitorAchievements}
      />,
    )

    expect(getTitles(container)).toEqual(["Книжный червь"])
    expect(getCards(container)).toHaveLength(1)

    const expectedDate = new Date("2025-02-10T00:00:00Z").toLocaleDateString(
      "ru-RU",
      { day: "numeric", month: "long", year: "numeric" },
    )
    expect(screen.getByText(expectedDate)).toBeInTheDocument()

    // Фильтры только у владельца.
    expect(screen.queryByRole("button", { name: "Все" })).not.toBeInTheDocument()
    // Прогресс и замки посетителю не показываются.
    expect(container.querySelector(".lucide-lock")).toBeNull()
  })

  it("iconUrl (эмодзи) рендерится, при отсутствии — иконка Star", () => {
    const { container } = render(
      <ProfileAchievements mode="owner" achievements={ownerAchievements} />,
    )

    expect(screen.getByText("📚")).toBeInTheDocument()
    expect(screen.getByText("⚡")).toBeInTheDocument()
    // У a4 (Коллекционер) iconUrl нет — рисуется Star.
    expect(container.querySelector(".lucide-star")).not.toBeNull()
  })

  it("секретное нераскрытое у владельца — «Секретное достижение» / «???», у посетителя секретных нет", () => {
    const { container } = render(
      <ProfileAchievements mode="owner" achievements={ownerAchievements} />,
    )

    expect(screen.getByText("Секретное достижение")).toBeInTheDocument()
    expect(screen.getByText("???")).toBeInTheDocument()
    // Настоящее название и описание скрыты.
    expect(screen.queryByText("Ночное дежурство")).not.toBeInTheDocument()
    expect(screen.queryByText("Тайное описание")).not.toBeInTheDocument()
    expect(getCards(container)).toHaveLength(6)

    const visitor = render(
      <ProfileAchievements
        mode="visitor"
        achievements={visitorAchievements}
      />,
    )
    expect(visitor.container.querySelector(".lucide-lock")).toBeNull()
    expect(getTitles(visitor.container)).toEqual(["Книжный червь"])
  })

  it("прогресс «12 / 50» рендерится для незаработанных с progress", () => {
    render(<ProfileAchievements mode="owner" achievements={ownerAchievements} />)

    expect(screen.getByText("12 / 50")).toBeInTheDocument()
    expect(screen.getByText("5 / 20")).toBeInTheDocument()
    // У полученных прогресса нет.
    expect(screen.queryByText("10 / 50")).not.toBeInTheDocument()
  })

  it("limit обрезает список и показывает кнопку «Все достижения»", () => {
    const onShowAll = vi.fn()
    const { container } = render(
      <ProfileAchievements
        mode="owner"
        achievements={ownerAchievements}
        limit={2}
        onShowAll={onShowAll}
      />,
    )

    expect(getCards(container)).toHaveLength(2)
    fireEvent.click(screen.getByRole("button", { name: "Все достижения" }))
    expect(onShowAll).toHaveBeenCalledTimes(1)
  })

  it("isLoading — скелетоны вместо карточек и фильтров", () => {
    const { container } = render(
      <ProfileAchievements
        mode="owner"
        achievements={[]}
        isLoading
      />,
    )

    expect(container.querySelectorAll(".profile-achievements__skeleton-card")).toHaveLength(
      4,
    )
    expect(getCards(container)).toHaveLength(0)
    expect(screen.queryByRole("button", { name: "Все" })).not.toBeInTheDocument()
  })
})
