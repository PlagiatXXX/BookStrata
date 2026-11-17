/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileTabs } from "./ProfileTabs"

describe("ProfileTabs", () => {
  it("владельцу доступны четыре таба (включая «Настройки»)", () => {
    render(<ProfileTabs active="overview" isOwner onChange={vi.fn()} />)

    expect(screen.getByRole("tab", { name: "Обзор" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Тир-листы" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Достижения" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Настройки" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "Сравнение" })).not.toBeInTheDocument()
  })

  it("у посетителя три таба (без «Настроек»)", () => {
    render(<ProfileTabs active="overview" isOwner={false} onChange={vi.fn()} />)

    expect(screen.queryByRole("tab", { name: "Настройки" })).not.toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Обзор" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Тир-листы" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Достижения" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "Сравнение" })).not.toBeInTheDocument()
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
