/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileHero } from "./ProfileHero"
import type { ProfileHeroUser } from "./ProfileHero"

function makeProfile(overrides: Partial<ProfileHeroUser> = {}): ProfileHeroUser {
  return {
    id: 2,
    username: "fedor",
    avatarUrl: null,
    bio: "Люблю книги про робототехнику",
    socialLinks: [{ platform: "telegram", url: "https://t.me/fedor" }],
    isDonor: true,
    xp: 40,
    title: "Страничный глотатель",
    icon: "📄",
    role: "admin",
    createdAt: "2024-01-15T12:00:00.000Z",
    badges: [
      { id: 1, userId: 2, text: "Легенда", color: "purple", createdAt: "2024-02-01T00:00:00.000Z" },
    ],
    ...overrides,
  }
}

const baseProps = {
  onShare: vi.fn(),
  onOpenSettings: vi.fn(),
  onOpenModeration: vi.fn(),
  onEditAvatar: vi.fn(),
  onEditProfile: vi.fn(),
  onPreview: vi.fn(),
}

describe("ProfileHero — владелец", () => {
  it("видит камеру, «Редактировать профиль», «Как видят другие» и счётчик соцсетей", () => {
    render(<ProfileHero mode="owner" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    expect(screen.getByRole("button", { name: "Сменить аватар" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Редактировать профиль/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Как видят другие/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "+ Соцсеть · 1 из 6" })).toBeInTheDocument()
  })

  it("показывает звание с иконкой и дату регистрации", () => {
    render(<ProfileHero mode="owner" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    expect(screen.getByText("Страничный глотатель")).toBeInTheDocument()
    expect(screen.getByText("📄")).toBeInTheDocument()
    expect(screen.getByText(/На BookStrata с 15 января 2024/)).toBeInTheDocument()
  })

  it("показывает уровень с XP-подписью", () => {
    render(<ProfileHero mode="owner" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    expect(screen.getByText("Уровень 1")).toBeInTheDocument()
    expect(screen.getByText("40 / 100 XP до уровня 2")).toBeInTheDocument()
  })

  it("показывает роль, донат-бейдж и кастомные бейджи", () => {
    render(<ProfileHero mode="owner" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    expect(screen.getByText("Админ")).toBeInTheDocument()
    expect(screen.getByText("Меценат")).toBeInTheDocument()
    expect(screen.getByText("Легенда")).toBeInTheDocument()
  })

  it("рендерит соцсети-чипы ссылками", () => {
    render(<ProfileHero mode="owner" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    const chip = screen.getByRole("link", { name: /telegram/i })
    expect(chip).toHaveAttribute("href", "https://t.me/fedor")
    expect(chip).toHaveAttribute("target", "_blank")
  })

  it("кнопка «+ Соцсеть» открывает настройки", () => {
    render(<ProfileHero mode="owner" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    fireEvent.click(screen.getByRole("button", { name: "+ Соцсеть · 1 из 6" }))
    expect(baseProps.onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it("«Редактировать профиль» и камера вызывают свои колбэки", () => {
    render(<ProfileHero mode="owner" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    fireEvent.click(screen.getByRole("button", { name: /Редактировать профиль/ }))
    expect(baseProps.onEditProfile).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Сменить аватар" }))
    expect(baseProps.onEditAvatar).toHaveBeenCalledTimes(1)
  })

  it("кнопка «Поделиться» вызывает onShare", () => {
    render(<ProfileHero mode="owner" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    fireEvent.click(screen.getByRole("button", { name: /Поделиться/ }))
    expect(baseProps.onShare).toHaveBeenCalledTimes(1)
  })

  it("isPreview скрывает камеру, редактирование, «Как видят другие» и счётчик соцсетей", () => {
    render(<ProfileHero mode="owner" profile={makeProfile()} isStaffVisitor={false} isPreview {...baseProps} />)

    expect(screen.queryByRole("button", { name: "Сменить аватар" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Редактировать профиль/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Как видят другие/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /\+ Соцсеть/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Поделиться/ })).toBeInTheDocument()
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument()
  })

  it("при лимите 6 соцсетей кнопка добавления скрыта", () => {
    const links = Array.from({ length: 6 }, (_, i) => ({
      platform: `website${i === 0 ? "" : i}`,
      url: `https://example.com/${i}`,
    }))
    render(
      <ProfileHero mode="owner" profile={makeProfile({ socialLinks: links })} isStaffVisitor={false} isPreview={false} {...baseProps} />,
    )
    expect(screen.queryByRole("button", { name: /\+ Соцсеть/ })).not.toBeInTheDocument()
  })
})

describe("ProfileHero — посетитель", () => {
  it("не видит камеру, редактирование и счётчик соцсетей; видит «Поделиться»", () => {
    render(<ProfileHero mode="visitor" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    expect(screen.queryByRole("button", { name: "Сменить аватар" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Редактировать профиль/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /\+ Соцсеть/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Как видят другие/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Поделиться/ })).toBeInTheDocument()
  })

  it("не видит подпись XP, но видит уровень", () => {
    render(<ProfileHero mode="visitor" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    expect(screen.getByText("Уровень 1")).toBeInTheDocument()
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument()
  })

  it("обычному посетителю кнопка «Управление» не показывается", () => {
    render(<ProfileHero mode="visitor" profile={makeProfile()} isStaffVisitor={false} isPreview={false} {...baseProps} />)

    expect(screen.queryByRole("button", { name: /Управление/ })).not.toBeInTheDocument()
  })
})

describe("ProfileHero — staff-посетитель", () => {
  it("показывает «Управление» и вызывает onOpenModeration", () => {
    render(<ProfileHero mode="visitor" profile={makeProfile()} isStaffVisitor {...baseProps} isPreview={false} />)

    fireEvent.click(screen.getByRole("button", { name: /Управление/ }))
    expect(baseProps.onOpenModeration).toHaveBeenCalledTimes(1)
  })
})
