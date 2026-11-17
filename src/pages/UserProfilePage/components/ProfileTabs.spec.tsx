/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileTabs } from "./ProfileTabs"

describe("ProfileTabs", () => {
  it("владельцу доступны все четыре таба", () => {
    render(<ProfileTabs active="overview" isOwner onChange={vi.fn()} />)

    expect(screen.getByRole("tab", { name: "Обзор" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Тир-листы" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Достижения" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Настройки" })).toBeInTheDocument()
  })

  it("у посетителя нет таба «Настройки»", () => {
    render(<ProfileTabs active="overview" isOwner={false} onChange={vi.fn()} />)

    expect(screen.queryByRole("tab", { name: "Настройки" })).not.toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Обзор" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Тир-листы" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Достижения" })).toBeInTheDocument()
  })

  it("активный таб помечен aria-selected", () => {
    render(<ProfileTabs active="tier-lists" isOwner={false} onChange={vi.fn()} />)

    expect(screen.getByRole("tab", { name: "Тир-листы" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tab", { name: "Обзор" })).toHaveAttribute(
      "aria-selected",
      "false",
    )
  })

  it("клик по табу вызывает onChange с его значением", () => {
    const onChange = vi.fn()
    render(<ProfileTabs active="overview" isOwner onChange={onChange} />)

    fireEvent.click(screen.getByRole("tab", { name: "Достижения" }))
    expect(onChange).toHaveBeenCalledWith("achievements")
  })
})
