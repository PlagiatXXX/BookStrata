/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProfileLevel } from "./ProfileLevel"

describe("ProfileLevel", () => {
  it("показывает уровень и подпись XP владельцу", () => {
    render(<ProfileLevel xp={40} showXpLabel />)
    expect(screen.getByText("Уровень 1")).toBeInTheDocument()
    expect(screen.getByText("40 / 100 XP до уровня 2")).toBeInTheDocument()
  })

  it("посетителю подпись XP не показывается", () => {
    render(<ProfileLevel xp={40} showXpLabel={false} />)
    expect(screen.getByText("Уровень 1")).toBeInTheDocument()
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument()
  })

  it("шкала отражает прогресс внутри уровня", () => {
    render(<ProfileLevel xp={40} showXpLabel />)
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "40")
    expect(bar).toHaveAttribute("aria-valuemax", "100")
    const fill = bar.firstElementChild as HTMLElement
    expect(fill.style.width).toBe("40%")
  })

  it("считает уровень с переносом: 250 XP → уровень 3, 50%", () => {
    render(<ProfileLevel xp={250} showXpLabel />)
    expect(screen.getByText("Уровень 3")).toBeInTheDocument()
    expect(screen.getByText("50 / 100 XP до уровня 4")).toBeInTheDocument()
    const bar = screen.getByRole("progressbar")
    const fill = bar.firstElementChild as HTMLElement
    expect(fill.style.width).toBe("50%")
  })
})
