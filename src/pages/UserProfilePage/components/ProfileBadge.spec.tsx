/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProfileBadge } from "./ProfileBadge"

describe("ProfileBadge", () => {
  it("рендерит текст бейджа", () => {
    render(<ProfileBadge text="Легенда" color="purple" />)
    expect(screen.getByText("Легенда")).toBeInTheDocument()
  })

  it.each([
    ["purple", "profile-badge--purple"],
    ["blue", "profile-badge--blue"],
    ["amber", "profile-badge--amber"],
    ["green", "profile-badge--green"],
    ["red", "profile-badge--red"],
    ["cyan", "profile-badge--cyan"],
  ])("применяет класс цвета %s", (color, expectedClass) => {
    render(<ProfileBadge text="Бейдж" color={color} />)
    expect(screen.getByText("Бейдж")).toHaveClass("profile-badge", expectedClass)
  })

  it("неизвестный цвет откатывается к cyan", () => {
    render(
      <ProfileBadge text="Бейдж" color={"pink" as never} />,
    )
    expect(screen.getByText("Бейдж")).toHaveClass("profile-badge", "profile-badge--cyan")
    expect(screen.getByText("Бейдж")).not.toHaveClass("profile-badge--pink")
  })

  it("выводит юмористическое описание во всплывающем тултипе и в aria-label", () => {
    render(<ProfileBadge text="Админ" color="purple" />)
    const badge = screen.getByText("Админ")
    expect(badge).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Верховный архитектор книжных полок"),
    )
    expect(badge).not.toHaveAttribute("title")
    expect(screen.getByRole("tooltip")).toHaveTextContent("Верховный архитектор книжных полок")
  })

  it("поддерживает кастомное описание, если передано", () => {
    render(<ProfileBadge text="Писатель" color="amber" description="Пишет быстрее, чем Джордж Мартин" />)
    expect(screen.getByRole("tooltip")).toHaveTextContent("Пишет быстрее, чем Джордж Мартин")
  })
})
