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
})
